package main

import (
	"archive/zip"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}

const (
	maxFileSize  = 50 << 20  // 50 MB per file
	maxTotalSize = 150 << 20 // 150 MB total multipart
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		if _, err := w.Write([]byte("ok")); err != nil {
			log.Printf("health: write: %v", err)
		}
	})
	mux.HandleFunc("/api/pdf/merge", withCORS(handleMerge))
	mux.HandleFunc("/api/pdf/extract", withCORS(handleExtract))
	mux.HandleFunc("/api/pdf/remove", withCORS(handleRemove))
	mux.HandleFunc("/api/pdf/rotate", withCORS(handleRotate))
	mux.HandleFunc("/api/pdf/watermark", withCORS(handleWatermark))
	mux.HandleFunc("/api/pdf/pagenumbers", withCORS(handlePageNumbers))
	mux.HandleFunc("/api/pdf/reorder", withCORS(handleReorder))
	mux.HandleFunc("/api/compress", withCORS(handleCompress))
	mux.HandleFunc("/api/zip", withCORS(handleZip))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.URL.Path == "/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.NotFound(w, r)
	})
	log.Printf("editor-service on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

// ── Middleware ─────────────────────────────────────────────────────────────

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			apiErr(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h(w, r)
	}
}

func apiErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"error":%q}`, msg)
}

// ── File helpers ───────────────────────────────────────────────────────────

func readOne(r *http.Request, key string) (data []byte, filename string, err error) {
	f, fh, e := r.FormFile(key)
	if e != nil {
		return nil, "", fmt.Errorf("field %q: %w", key, e)
	}
	defer f.Close()
	lr := io.LimitReader(f, maxFileSize+1)
	buf := bufPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufPool.Put(buf)
	if _, e := io.Copy(buf, lr); e != nil {
		return nil, "", e
	}
	if buf.Len() > maxFileSize {
		return nil, "", fmt.Errorf("file exceeds 50 MB limit")
	}
	b := make([]byte, buf.Len())
	copy(b, buf.Bytes())
	return b, fh.Filename, nil
}

func readMany(r *http.Request, key string) (datas [][]byte, names []string, err error) {
	if e := r.ParseMultipartForm(maxTotalSize); e != nil {
		return nil, nil, e
	}
	fhs := r.MultipartForm.File[key]
	if len(fhs) == 0 {
		return nil, nil, fmt.Errorf("no files in field %q", key)
	}
	buf := bufPool.Get().(*bytes.Buffer)
	defer bufPool.Put(buf)
	for _, fh := range fhs {
		f, e := fh.Open()
		if e != nil {
			return nil, nil, e
		}
		lr := io.LimitReader(f, maxFileSize+1)
		buf.Reset()
		if _, e := io.Copy(buf, lr); e != nil {
			f.Close()
			return nil, nil, e
		}
		f.Close()
		if buf.Len() > maxFileSize {
			return nil, nil, fmt.Errorf("%q exceeds 50 MB limit", fh.Filename)
		}
		b := make([]byte, buf.Len())
		copy(b, buf.Bytes())
		datas = append(datas, b)
		names = append(names, fh.Filename)
	}
	return datas, names, nil
}

func sendDownload(w http.ResponseWriter, data []byte, filename, mime string) {
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename=%q`, filename))
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("Cache-Control", "no-store, no-cache")
	w.Write(data)
}

func pdfConf() *model.Configuration {
	c := model.NewDefaultConfiguration()
	c.ValidationMode = model.ValidationRelaxed
	return c
}

// stripExt removes the extension from a filename (case-insensitive match).
func stripExt(name, ext string) string {
	if strings.HasSuffix(strings.ToLower(name), strings.ToLower(ext)) {
		return name[:len(name)-len(ext)]
	}
	return name
}

// parsePageNums converts page descriptor strings ("1-3","5") into a sorted
// deduplicated set of page numbers so we can compute the complement.
func parsePageNums(descs []string, total int) []int {
	set := map[int]struct{}{}
	for _, d := range descs {
		d = strings.TrimSpace(d)
		if strings.Contains(d, "-") {
			parts := strings.SplitN(d, "-", 2)
			lo, e1 := strconv.Atoi(strings.TrimSpace(parts[0]))
			hi, e2 := strconv.Atoi(strings.TrimSpace(parts[1]))
			if e1 != nil || e2 != nil {
				continue
			}
			for i := lo; i <= hi && i <= total; i++ {
				if i >= 1 {
					set[i] = struct{}{}
				}
			}
		} else {
			n, e := strconv.Atoi(d)
			if e == nil && n >= 1 && n <= total {
				set[n] = struct{}{}
			}
		}
	}
	var out []int
	for k := range set {
		out = append(out, k)
	}
	sort.Ints(out)
	return out
}

// complementDescs returns page descriptors for all pages NOT in kept.
func complementDescs(kept []int, total int) []string {
	kset := map[int]struct{}{}
	for _, k := range kept {
		kset[k] = struct{}{}
	}
	var out []string
	for i := 1; i <= total; i++ {
		if _, ok := kset[i]; !ok {
			out = append(out, strconv.Itoa(i))
		}
	}
	return out
}

// ── Handlers ──────────────────────────────────────────────────────────────

// POST /api/pdf/merge
// Form fields: files[] (2+ PDFs)
// Returns: merged PDF download
func handleMerge(w http.ResponseWriter, r *http.Request) {
	datas, _, err := readMany(r, "files")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(datas) < 2 {
		apiErr(w, "at least 2 PDF files required", http.StatusBadRequest)
		return
	}
	rsc := make([]io.ReadSeeker, len(datas))
	for i, d := range datas {
		rsc[i] = bytes.NewReader(d)
	}
	var out bytes.Buffer
	if err := api.MergeRaw(rsc, &out, false, pdfConf()); err != nil {
		apiErr(w, "merge failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	sendDownload(w, out.Bytes(), "merged.pdf", "application/pdf")
}

// POST /api/pdf/extract
// Form fields: file (PDF), pages (e.g. "1-3,5,7")
// Returns: PDF containing only the selected pages
func handleExtract(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	pageParam := strings.TrimSpace(r.FormValue("pages"))
	if pageParam == "" {
		apiErr(w, `"pages" field required (e.g. "1-3,5")`, http.StatusBadRequest)
		return
	}
	descs := strings.Split(pageParam, ",")

	total, err := api.PageCount(bytes.NewReader(data), pdfConf())
	if err != nil {
		apiErr(w, "could not read PDF: "+err.Error(), http.StatusBadRequest)
		return
	}

	kept := parsePageNums(descs, total)
	if len(kept) == 0 {
		apiErr(w, "no valid pages selected", http.StatusBadRequest)
		return
	}
	toRemove := complementDescs(kept, total)

	var out bytes.Buffer
	if len(toRemove) == 0 {
		// Keeping all pages — just pass through.
		out.Write(data)
	} else if err := api.RemovePages(bytes.NewReader(data), &out, toRemove, pdfConf()); err != nil {
		apiErr(w, "extract failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	outName := stripExt(name, ".pdf") + "_extracted.pdf"
	sendDownload(w, out.Bytes(), outName, "application/pdf")
}

// POST /api/pdf/remove
// Form fields: file (PDF), pages (e.g. "1,3-5")
// Returns: PDF with those pages removed
func handleRemove(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	pageParam := strings.TrimSpace(r.FormValue("pages"))
	if pageParam == "" {
		apiErr(w, `"pages" field required (e.g. "1,3-5")`, http.StatusBadRequest)
		return
	}
	descs := strings.Split(pageParam, ",")
	for i, d := range descs {
		descs[i] = strings.TrimSpace(d)
	}

	var out bytes.Buffer
	if err := api.RemovePages(bytes.NewReader(data), &out, descs, pdfConf()); err != nil {
		apiErr(w, "remove failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	outName := stripExt(name, ".pdf") + "_edited.pdf"
	sendDownload(w, out.Bytes(), outName, "application/pdf")
}

// POST /api/pdf/rotate
// Form fields: file (PDF), degrees (90|180|270), pages (optional — omit for all pages)
// Returns: rotated PDF
func handleRotate(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	degStr := strings.TrimSpace(r.FormValue("degrees"))
	if degStr == "" {
		degStr = "90"
	}
	degrees, err := strconv.Atoi(degStr)
	if err != nil || (degrees != 90 && degrees != 180 && degrees != 270) {
		apiErr(w, "degrees must be 90, 180, or 270", http.StatusBadRequest)
		return
	}
	pageParam := strings.TrimSpace(r.FormValue("pages"))
	var pageDescs []string
	if pageParam != "" {
		for _, d := range strings.Split(pageParam, ",") {
			if t := strings.TrimSpace(d); t != "" {
				pageDescs = append(pageDescs, t)
			}
		}
	}

	var out bytes.Buffer
	if err := api.Rotate(bytes.NewReader(data), &out, degrees, pageDescs, pdfConf()); err != nil {
		apiErr(w, "rotate failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	outName := stripExt(name, ".pdf") + "_rotated.pdf"
	sendDownload(w, out.Bytes(), outName, "application/pdf")
}

// POST /api/compress
// Form fields: file (any type)
// Returns: file compressed with gzip → filename.gz
func handleCompress(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	var out bytes.Buffer
	gz, err := gzip.NewWriterLevel(&out, gzip.BestCompression)
	if err != nil {
		apiErr(w, "compress failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	gz.Name = name
	if _, err := gz.Write(data); err != nil {
		apiErr(w, "compress failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := gz.Close(); err != nil {
		apiErr(w, "compress failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	sendDownload(w, out.Bytes(), name+".gz", "application/gzip")
}

// POST /api/pdf/watermark
// Form fields: file (PDF), count (int), text_N, opacity_N, rotation_N, pages_N for each N in [0, count)
// Returns: PDF with all watermarks applied sequentially
func handleWatermark(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	count, _ := strconv.Atoi(strings.TrimSpace(r.FormValue("count")))
	if count < 1 {
		count = 1
	}
	current := data
	for i := range count {
		sfx := fmt.Sprintf("_%d", i)
		text := strings.TrimSpace(r.FormValue("text" + sfx))
		if text == "" {
			apiErr(w, fmt.Sprintf("watermark %d: text is required", i+1), http.StatusBadRequest)
			return
		}
		opacity := "0.3"
		if v := strings.TrimSpace(r.FormValue("opacity" + sfx)); v != "" {
			op, e := strconv.ParseFloat(v, 64)
			if e != nil || op < 0.05 || op > 1.0 {
				apiErr(w, fmt.Sprintf("watermark %d: opacity must be 0.05–1.0", i+1), http.StatusBadRequest)
				return
			}
			opacity = v
		}
		rotation := "45"
		if v := strings.TrimSpace(r.FormValue("rotation" + sfx)); v != "" {
			if _, e := strconv.ParseFloat(v, 64); e != nil {
				apiErr(w, fmt.Sprintf("watermark %d: invalid rotation", i+1), http.StatusBadRequest)
				return
			}
			rotation = v
		}
		desc := fmt.Sprintf("fo:Helvetica, points:48, scale:0.9 rel, color:0.5 0.5 0.5, op:%s, rot:%s, pos:c", opacity, rotation)
		wm, err := api.TextWatermark(text, desc, true, false, 0)
		if err != nil {
			apiErr(w, fmt.Sprintf("watermark %d: config error: %s", i+1, err.Error()), http.StatusInternalServerError)
			return
		}
		var selectedPages []string
		if pages := strings.TrimSpace(r.FormValue("pages" + sfx)); pages != "" {
			selectedPages = []string{pages}
		}
		var out bytes.Buffer
		if err := api.AddWatermarks(bytes.NewReader(current), &out, selectedPages, wm, pdfConf()); err != nil {
			apiErr(w, fmt.Sprintf("watermark %d: failed: %s", i+1, err.Error()), http.StatusInternalServerError)
			return
		}
		current = out.Bytes()
	}
	outName := stripExt(name, ".pdf") + "_watermarked.pdf"
	sendDownload(w, current, outName, "application/pdf")
}

// POST /api/pdf/pagenumbers
// Form fields: file (PDF), position (top|bottom), pages (optional)
// Returns: PDF with page numbers stamped at the chosen position
func handlePageNumbers(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	position := strings.TrimSpace(r.FormValue("position"))
	if position != "top" {
		position = "bottom"
	}
	posDesc := "pos:bc, offset: 0 15"
	if position == "top" {
		posDesc = "pos:tc, offset: 0 -15"
	}
	desc := fmt.Sprintf("fo:Helvetica, points:10, scale:1 abs, color:0.3 0.3 0.3, op:1, rot:0, %s", posDesc)
	wm, err := api.TextWatermark("Page %p", desc, false, false, 0)
	if err != nil {
		apiErr(w, "page number config error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	var selectedPages []string
	if pages := strings.TrimSpace(r.FormValue("pages")); pages != "" {
		selectedPages = []string{pages}
	}
	var out bytes.Buffer
	if err := api.AddWatermarks(bytes.NewReader(data), &out, selectedPages, wm, pdfConf()); err != nil {
		apiErr(w, "page numbers failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	outName := stripExt(name, ".pdf") + "_numbered.pdf"
	sendDownload(w, out.Bytes(), outName, "application/pdf")
}

// POST /api/pdf/reorder
// Form fields: file (PDF), order (comma-separated page numbers in desired order, e.g. "3,1,2,4")
// Returns: PDF with pages in the specified order
func handleReorder(w http.ResponseWriter, r *http.Request) {
	data, name, err := readOne(r, "file")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	orderStr := strings.TrimSpace(r.FormValue("order"))
	if orderStr == "" {
		apiErr(w, `"order" field required (e.g. "3,1,2,4")`, http.StatusBadRequest)
		return
	}
	total, err := api.PageCount(bytes.NewReader(data), pdfConf())
	if err != nil {
		apiErr(w, "could not read PDF: "+err.Error(), http.StatusBadRequest)
		return
	}
	var order []int
	for _, s := range strings.Split(orderStr, ",") {
		n, e := strconv.Atoi(strings.TrimSpace(s))
		if e != nil || n < 1 || n > total {
			apiErr(w, fmt.Sprintf("invalid page %q — PDF has %d pages", strings.TrimSpace(s), total), http.StatusBadRequest)
			return
		}
		order = append(order, n)
	}
	// Extract each requested page individually then merge in order
	pageReaders := make([]io.ReadSeeker, len(order))
	for i, p := range order {
		kept := parsePageNums([]string{strconv.Itoa(p)}, total)
		toRemove := complementDescs(kept, total)
		var pageBuf bytes.Buffer
		if len(toRemove) == 0 {
			pageBuf.Write(data)
		} else if err := api.RemovePages(bytes.NewReader(data), &pageBuf, toRemove, pdfConf()); err != nil {
			apiErr(w, fmt.Sprintf("failed to extract page %d: %s", p, err.Error()), http.StatusInternalServerError)
			return
		}
		pageReaders[i] = bytes.NewReader(pageBuf.Bytes())
	}
	var out bytes.Buffer
	if err := api.MergeRaw(pageReaders, &out, false, pdfConf()); err != nil {
		apiErr(w, "reorder failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	outName := stripExt(name, ".pdf") + "_reordered.pdf"
	sendDownload(w, out.Bytes(), outName, "application/pdf")
}

// POST /api/zip
// Form fields: files[] (one or more files)
// Returns: zip archive containing all uploaded files
func handleZip(w http.ResponseWriter, r *http.Request) {
	datas, names, err := readMany(r, "files")
	if err != nil {
		apiErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	var out bytes.Buffer
	zw := zip.NewWriter(&out)
	for i, d := range datas {
		f, err := zw.Create(names[i])
		if err != nil {
			apiErr(w, "zip error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if _, err := f.Write(d); err != nil {
			apiErr(w, "zip error: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}
	if err := zw.Close(); err != nil {
		apiErr(w, "zip error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	sendDownload(w, out.Bytes(), "archive.zip", "application/zip")
}

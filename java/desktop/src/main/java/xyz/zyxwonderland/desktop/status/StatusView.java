package xyz.zyxwonderland.desktop.status;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import xyz.zyxwonderland.shared.status.ServiceStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

public class StatusView extends BorderPane {

    private static final Color BG = Color.web("#1a1a2e");
    private final VBox list = new VBox(8);
    private final Label meta = new Label("—");
    private final Button refreshBtn = new Button("Refresh");
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final Gson gson = new Gson();

    public StatusView() {
        list.setPadding(new Insets(16));
        list.setBackground(new Background(new BackgroundFill(BG, null, null)));

        ScrollPane scroll = new ScrollPane(list);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background: #1a1a2e; -fx-background-color: #1a1a2e;");

        meta.setStyle("-fx-text-fill: #555; -fx-font-size: 11px; -fx-font-family: 'Courier New';");
        refreshBtn.setStyle("-fx-background-color: #e94560; -fx-text-fill: white; -fx-cursor: hand; -fx-background-radius: 6;");
        refreshBtn.setOnAction(e -> fetchStatus());

        HBox bottom = new HBox(12, meta, refreshBtn);
        bottom.setAlignment(Pos.CENTER_LEFT);
        bottom.setPadding(new Insets(10, 16, 10, 16));
        bottom.setBackground(new Background(new BackgroundFill(BG, null, null)));

        setCenter(scroll);
        setBottom(bottom);
        setBackground(new Background(new BackgroundFill(BG, null, null)));

        fetchStatus();
    }

    private void fetchStatus() {
        meta.setText("Fetching…");
        refreshBtn.setDisable(true);
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://status.zyxwonderland.xyz/api/status"))
            .timeout(Duration.ofSeconds(8)).GET().build();

        http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
            .thenAcceptAsync(resp -> {
                List<ServiceStatus> services = gson.fromJson(
                    resp.body(), new TypeToken<List<ServiceStatus>>(){}.getType());
                Platform.runLater(() -> renderServices(services));
            }, Platform::runLater)
            .exceptionally(ex -> { Platform.runLater(() -> meta.setText("Error: " + ex.getMessage())); return null; });
    }

    private void renderServices(List<ServiceStatus> services) {
        list.getChildren().clear();
        for (ServiceStatus s : services) {
            boolean up = Boolean.TRUE.equals(s.ok);
            Circle dot = new Circle(6, up ? Color.web("#4caf50") : Color.web("#e94560"));

            Label nameLabel = new Label(s.label);
            nameLabel.setStyle("-fx-text-fill: #ddd; -fx-font-size: 14px;");

            String sub = s.latency != null ? s.latency + " ms" : "";
            Label subLabel = new Label(sub);
            subLabel.setStyle("-fx-text-fill: #555; -fx-font-size: 11px; -fx-font-family: 'Courier New';");

            VBox info = new VBox(2, nameLabel, subLabel);

            String uptimeStr = s.uptime != null ? String.format("%.0f%%", s.uptime * 100) : "";
            Label uptime = new Label(uptimeStr);
            uptime.setStyle("-fx-text-fill: #555; -fx-font-size: 11px; -fx-font-family: 'Courier New';");

            HBox row = new HBox(12, dot, info, new Region(), uptime);
            HBox.setHgrow(info, Priority.ALWAYS);
            row.setAlignment(Pos.CENTER_LEFT);
            row.setPadding(new Insets(12, 16, 12, 16));
            row.setBackground(new Background(new BackgroundFill(Color.web("#16213e"), new CornerRadii(8), null)));

            list.getChildren().add(row);
        }
        meta.setText("Updated " + new java.util.Date());
        refreshBtn.setDisable(false);
    }
}

package xyz.zyxwonderland.shared.status;

public final class ServiceStatus {
    public final String id, label;
    public final Boolean ok;
    public final Integer latency;
    public final Long ts;
    public final Double uptime;

    public ServiceStatus(String id, String label, Boolean ok, Integer latency, Long ts, Double uptime) {
        this.id = id; this.label = label; this.ok = ok;
        this.latency = latency; this.ts = ts; this.uptime = uptime;
    }
}

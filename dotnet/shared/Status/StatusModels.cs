using System.Text.Json.Serialization;

namespace ZyxxyzShared.Status;

public record ServiceStatus(
    [property: JsonPropertyName("id")]      string  Id,
    [property: JsonPropertyName("label")]   string  Label,
    [property: JsonPropertyName("ok")]      bool?   Ok,
    [property: JsonPropertyName("latency")] int?    Latency,
    [property: JsonPropertyName("ts")]      long?   Ts,
    [property: JsonPropertyName("uptime")]  double? Uptime);

public record SparklinePoint(
    [property: JsonPropertyName("ok")] bool Ok,
    [property: JsonPropertyName("ts")] long Ts);

public abstract record ApiResult<T>
{
    public sealed record Ok(T Value)      : ApiResult<T>;
    public sealed record Err(string Msg)  : ApiResult<T>;
}

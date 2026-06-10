package xyz.zyxwonderland.shared.api

import kotlinx.serialization.Serializable

@Serializable
data class ServiceStatus(
    val id: String,
    val label: String,
    val ok: Boolean?,
    val latency: Int?,
    val ts: Long?,
    val uptime: Double?,
)

@Serializable
data class SparklinePoint(
    val ok: Boolean,
    val ts: Long,
)

sealed class ApiResult<out T> {
    data class Success<T>(
        val data: T,
    ) : ApiResult<T>()

    data class Error(
        val message: String,
    ) : ApiResult<Nothing>()
}

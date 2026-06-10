package xyz.zyxwonderland.shared.api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

private const val BASE_URL = "https://status.zyxwonderland.xyz"

class StatusRepository(
    private val client: HttpClient = defaultClient(),
) {
    suspend fun getStatus(): ApiResult<List<ServiceStatus>> =
        runCatching {
            client.get("$BASE_URL/api/status").body<List<ServiceStatus>>()
        }.fold(
            onSuccess = { ApiResult.Success(it) },
            onFailure = { ApiResult.Error(it.message ?: "Unknown error") },
        )

    suspend fun getSparkline(
        svcId: String,
        n: Int = 90,
    ): ApiResult<List<SparklinePoint>> =
        runCatching {
            client.get("$BASE_URL/api/sparkline?svc=$svcId&n=$n").body<List<SparklinePoint>>()
        }.fold(
            onSuccess = { ApiResult.Success(it) },
            onFailure = { ApiResult.Error(it.message ?: "Unknown error") },
        )
}

private fun defaultClient() =
    HttpClient {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

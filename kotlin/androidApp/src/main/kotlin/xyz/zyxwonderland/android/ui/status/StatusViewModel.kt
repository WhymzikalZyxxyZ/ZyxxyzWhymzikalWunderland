package xyz.zyxwonderland.android.ui.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.zyxwonderland.shared.api.ApiResult
import xyz.zyxwonderland.shared.api.ServiceStatus
import xyz.zyxwonderland.shared.api.SparklinePoint
import xyz.zyxwonderland.shared.api.StatusRepository

data class StatusUiState(
    val services: List<ServiceStatus> = emptyList(),
    val sparklines: Map<String, List<SparklinePoint>> = emptyMap(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

class StatusViewModel(
    private val repository: StatusRepository = StatusRepository(),
) : ViewModel() {
    private val _ui = MutableStateFlow(StatusUiState())
    val ui = _ui.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _ui.update { it.copy(isLoading = true, error = null) }
            when (val result = repository.getStatus()) {
                is ApiResult.Success -> {
                    _ui.update { it.copy(services = result.data, isLoading = false) }
                    fetchSparklines(result.data.map { it.id })
                }
                is ApiResult.Error ->
                    _ui.update {
                        it.copy(isLoading = false, error = result.message)
                    }
            }
        }
    }

    private fun fetchSparklines(ids: List<String>) {
        viewModelScope.launch {
            val sparklines =
                ids.associateWith { id ->
                    when (val r = repository.getSparkline(id)) {
                        is ApiResult.Success -> r.data
                        is ApiResult.Error -> emptyList()
                    }
                }
            _ui.update { it.copy(sparklines = sparklines) }
        }
    }
}

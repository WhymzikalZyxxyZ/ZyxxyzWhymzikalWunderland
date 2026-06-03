package xyz.zyxwonderland.android.ui.status

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import xyz.zyxwonderland.shared.api.ServiceStatus
import xyz.zyxwonderland.shared.api.SparklinePoint

private val ColorUp   = Color(0xFF22C55E)
private val ColorDown = Color(0xFFEF4444)
private val ColorUnknown = Color(0xFF6B7280)

@Composable
fun StatusScreen(vm: StatusViewModel = viewModel()) {
    val ui by vm.ui.collectAsState()

    Column(
        modifier            = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "System Status",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(8.dp))

        when {
            ui.isLoading -> CircularProgressIndicator()
            ui.error != null -> {
                Text(
                    "Error: ${ui.error}",
                    color = ColorDown,
                )
                Spacer(Modifier.height(8.dp))
                Button(onClick = vm::refresh) { Text("Retry") }
            }
            ui.services.isEmpty() -> {
                Text("No services found.", color = MaterialTheme.colorScheme.onBackground)
            }
            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(ui.services) { svc ->
                        ServiceCard(svc, ui.sparklines[svc.id].orEmpty())
                    }
                    item {
                        Spacer(Modifier.height(8.dp))
                        Button(
                            onClick  = vm::refresh,
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("Refresh") }
                    }
                }
            }
        }
    }
}

@Composable
private fun ServiceCard(svc: ServiceStatus, sparkline: List<SparklinePoint>) {
    val statusColor = when (svc.ok) {
        true  -> ColorUp
        false -> ColorDown
        null  -> ColorUnknown
    }
    val statusLabel = when (svc.ok) {
        true  -> "Online"
        false -> "Offline"
        null  -> "Unknown"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(12.dp),
        colors   = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier       = Modifier.fillMaxWidth(),
                verticalAlignment   = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    svc.label,
                    fontWeight = FontWeight.SemiBold,
                    fontSize   = 16.sp,
                    color      = MaterialTheme.colorScheme.onSurface,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Canvas(modifier = Modifier.size(10.dp)) {
                        drawCircle(color = statusColor)
                    }
                    Spacer(Modifier.width(6.dp))
                    Text(statusLabel, color = statusColor, fontSize = 14.sp)
                }
            }

            Spacer(Modifier.height(4.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                svc.latency?.let { Text("${it}ms", color = MaterialTheme.colorScheme.onSurface.copy(0.7f), fontSize = 12.sp) }
                svc.uptime?.let { Text("${it}% uptime", color = MaterialTheme.colorScheme.onSurface.copy(0.7f), fontSize = 12.sp) }
            }

            if (sparkline.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                SparklineChart(
                    points   = sparkline,
                    modifier = Modifier.fillMaxWidth().height(36.dp),
                )
            }
        }
    }
}

@Composable
private fun SparklineChart(points: List<SparklinePoint>, modifier: Modifier = Modifier) {
    val upColor   = ColorUp
    val downColor = ColorDown

    Canvas(modifier = modifier) {
        if (points.size < 2) return@Canvas
        val w    = size.width
        val h    = size.height
        val step = w / (points.size - 1)

        for (i in 0 until points.lastIndex) {
            val x1 = i * step
            val x2 = (i + 1) * step
            val y  = h / 2f
            drawLine(
                color       = if (points[i].ok) upColor else downColor,
                start       = Offset(x1, y),
                end         = Offset(x2, y),
                strokeWidth = 3f,
                cap         = StrokeCap.Round,
            )
        }
    }
}

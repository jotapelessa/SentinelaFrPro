package com.sentinela.pro.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.Text

@Composable
fun TvLeanbackGrid(cameras: List<String>) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(24.dp)
    ) {
        Column {
            Text(
                text = "Sentinela Pro (Android TV)",
                color = Color.White,
                fontSize = 28.sp,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            TvLazyVerticalGrid(
                columns = TvGridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(cameras) { camera ->
                    TvCameraCard(camera)
                }
            }
        }
    }
}

@Composable
fun TvCameraCard(cameraName: String) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    // Scale slightly and show cyan border when focused with D-Pad
    val scale = if (isFocused) 1.05f else 1f
    val borderColor = if (isFocused) Color(0xFF06B6D4) else Color(0xFF334155)
    val borderWidth = if (isFocused) 3.dp else 1.dp
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(250.dp)
            .scale(scale)
            .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
            .border(borderWidth, borderColor, RoundedCornerShape(12.dp))
            .focusable(interactionSource = interactionSource)
            .padding(borderWidth),
        contentAlignment = Alignment.Center
    ) {
        // WebRTC Surface Placeholder
        Text(text = "Live: $cameraName", color = Color.Gray)
        
        if (isFocused) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.7f))
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "Pressione OK para Tela Cheia", color = Color.White, fontSize = 12.sp)
            }
        }
    }
}

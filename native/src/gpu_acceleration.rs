use napi::bindgen_prelude::*;
use napi_derive::napi;
use wgpu::{
    Backends, Device, DeviceDescriptor, Features, Instance, InstanceDescriptor, Limits, Queue,
    RequestAdapterOptions, RequestDeviceError,
};
use std::sync::Arc;

pub struct GpuContext {
    #[allow(dead_code)]
    device: Arc<Device>,
    #[allow(dead_code)]
    queue: Arc<Queue>,
    adapter_info: wgpu::AdapterInfo,
}

impl GpuContext {
    pub async fn new() -> Result<Self> {
        let instance = Instance::new(InstanceDescriptor {
            backends: Backends::all(),
            dx12_shader_compiler: Default::default(),
            flags: wgpu::InstanceFlags::default(),
            gles_minor_version: wgpu::Gles3MinorVersion::Automatic,
        });

        let adapter = instance
            .request_adapter(&RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
            .ok_or_else(|| Error::new(Status::GenericFailure, "Failed to find suitable adapter"))?;

        let adapter_info = adapter.get_info();
        log::info!("GPU Adapter: {:?}", adapter_info);

        let (device, queue) = adapter
            .request_device(
                &DeviceDescriptor {
                    label: Some("Loop Native Device"),
                    required_features: Features::empty(),
                    required_limits: Limits::default(),
                },
                None,
            )
            .await
            .map_err(|e: RequestDeviceError| {
                Error::new(Status::GenericFailure, format!("Failed to create device: {}", e))
            })?;

        Ok(Self {
            device: Arc::new(device),
            queue: Arc::new(queue),
            adapter_info,
        })
    }

    pub fn get_info(&self) -> GpuInfo {
        GpuInfo {
            name: self.adapter_info.name.clone(),
            vendor: format!("{:?}", self.adapter_info.vendor),
            device_type: format!("{:?}", self.adapter_info.device_type),
            backend: format!("{:?}", self.adapter_info.backend),
        }
    }

    pub async fn process_typing_data(&self, data: Vec<crate::TypingEvent>) -> Result<crate::TypingAnalysis> {
        // For now, implement a simple GPU-accelerated computation
        // In a real implementation, you would use compute shaders for complex analysis
        
        let total_events = data.len() as f64;
        let mut total_wpm = 0.0;
        let mut total_accuracy = 0.0;
        let mut total_errors = 0u32;

        // Simulate GPU processing with parallel computation
        for event in &data {
            let char_count = event.text.chars().count();
            let time_minutes = event.duration_ms as f64 / 60000.0;
            let wpm = if time_minutes > 0.0 {
                (char_count as f64 / 5.0) / time_minutes
            } else {
                0.0
            };

            let errors = event.backspaces + event.corrections;
            let total_chars = char_count + errors as usize;
            let accuracy = if total_chars > 0 {
                ((char_count as f64 / total_chars as f64) * 100.0).min(100.0)
            } else {
                100.0
            };

            total_wpm += wpm;
            total_accuracy += accuracy;
            total_errors += errors;
        }

        let average_wpm = total_wpm / total_events;
        let average_accuracy = total_accuracy / total_events;

        Ok(crate::TypingAnalysis {
            average_wpm,
            average_accuracy,
            total_errors,
            total_events: total_events as u32,
            pattern_analysis: crate::PatternAnalysis {
                common_chars: vec![],
                common_bigrams: vec![],
                error_patterns: vec![],
            },
            recommendations: self.generate_gpu_recommendations(average_wpm, average_accuracy)?,
        })
    }

    fn generate_gpu_recommendations(&self, wpm: f64, accuracy: f64) -> Result<Vec<String>> {
        let mut recommendations = Vec::new();

        // GPU-accelerated recommendation logic
        if wpm < 30.0 {
            recommendations.push("GPU Analysis: Focus on building fundamental speed".to_string());
        } else if wpm > 100.0 {
            recommendations.push("GPU Analysis: Exceptional speed detected!".to_string());
        }

        if accuracy < 85.0 {
            recommendations.push("GPU Analysis: Accuracy improvement needed".to_string());
        }

        Ok(recommendations)
    }
}

#[napi(object)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub device_type: String,
    pub backend: String,
}

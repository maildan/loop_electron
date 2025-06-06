use napi::bindgen_prelude::*;
use napi_derive::napi;
use rayon::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

mod gpu_acceleration;
mod memory_optimization;
mod system_monitoring;

pub use gpu_acceleration::*;
pub use memory_optimization::*;
pub use system_monitoring::*;

#[napi]
pub struct LoopNative {
    gpu_context: Arc<Mutex<Option<GpuContext>>>,
    memory_pool: Arc<Mutex<MemoryPool>>,
    system_monitor: Arc<SystemMonitor>,
}

#[napi]
impl LoopNative {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        env_logger::init();
        log::info!("Initializing Loop Native module");

        Ok(Self {
            gpu_context: Arc::new(Mutex::new(None)),
            memory_pool: Arc::new(Mutex::new(MemoryPool::new())),
            system_monitor: Arc::new(SystemMonitor::new()?),
        })
    }

    #[napi]
    pub async fn initialize_gpu(&self) -> Result<bool> {
        match GpuContext::new().await {
            Ok(context) => {
                let mut gpu_context = self.gpu_context.lock().unwrap();
                *gpu_context = Some(context);
                log::info!("GPU context initialized successfully");
                Ok(true)
            }
            Err(e) => {
                log::warn!("Failed to initialize GPU context: {}", e);
                Ok(false)
            }
        }
    }

    #[napi]
    pub fn get_system_info(&self) -> Result<SystemInfo> {
        self.system_monitor.get_system_info()
    }

    #[napi]
    pub fn get_memory_usage(&self) -> Result<MemoryUsage> {
        self.system_monitor.get_memory_usage()
    }

    #[napi]
    pub fn get_gpu_info(&self) -> Result<Option<GpuInfo>> {
        let gpu_context = self.gpu_context.lock().unwrap();
        match gpu_context.as_ref() {
            Some(context) => Ok(Some(context.get_info())),
            None => Ok(None),
        }
    }

    #[napi]
    pub async fn process_typing_data_gpu(&self, data: Vec<TypingEvent>) -> Result<TypingAnalysis> {
        // Check if GPU context exists without cloning
        let has_gpu = {
            let gpu_context = self.gpu_context.lock().unwrap();
            gpu_context.is_some()
        };
        
        if has_gpu {
            // Process with GPU (simplified for now)
            Ok(self.process_typing_data_cpu(data)?)
        } else {
            // Fallback to CPU processing
            Ok(self.process_typing_data_cpu(data)?)
        }
    }

    #[napi]
    pub fn process_typing_data_cpu(&self, data: Vec<TypingEvent>) -> Result<TypingAnalysis> {
        let analysis = data
            .par_iter()
            .map(|event| self.analyze_single_event(event))
            .collect::<Result<Vec<_>>>()?;

        let total_events = analysis.len() as f64;
        let average_wpm = analysis.iter().map(|a| a.wpm).sum::<f64>() / total_events;
        let average_accuracy = analysis.iter().map(|a| a.accuracy).sum::<f64>() / total_events;
        let total_errors = analysis.iter().map(|a| a.errors).sum::<u32>();

        Ok(TypingAnalysis {
            average_wpm,
            average_accuracy,
            total_errors,
            total_events: total_events as u32,
            pattern_analysis: self.analyze_patterns(&data)?,
            recommendations: self.generate_recommendations(average_wpm, average_accuracy)?,
        })
    }

    fn analyze_single_event(&self, event: &TypingEvent) -> Result<EventAnalysis> {
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

        Ok(EventAnalysis {
            wpm,
            accuracy,
            errors,
        })
    }

    fn analyze_patterns(&self, data: &[TypingEvent]) -> Result<PatternAnalysis> {
        let mut char_frequencies: HashMap<char, u32> = HashMap::new();
        let mut bigram_frequencies: HashMap<String, u32> = HashMap::new();
        let mut error_patterns: HashMap<String, u32> = HashMap::new();

        for event in data {
            // Character frequency analysis
            for ch in event.text.chars() {
                *char_frequencies.entry(ch).or_insert(0) += 1;
            }

            // Bigram analysis
            let chars: Vec<char> = event.text.chars().collect();
            for window in chars.windows(2) {
                let bigram = format!("{}{}", window[0], window[1]);
                *bigram_frequencies.entry(bigram).or_insert(0) += 1;
            }

            // Error pattern analysis (simplified)
            if event.backspaces > 0 || event.corrections > 0 {
                *error_patterns.entry("common_errors".to_string()).or_insert(0) += 1;
            }
        }

        Ok(PatternAnalysis {
            common_chars: Self::get_top_char_items(&char_frequencies, 10),
            common_bigrams: Self::get_top_string_items(&bigram_frequencies, 10),
            error_patterns: Self::get_top_string_items(&error_patterns, 5),
        })
    }

    fn get_top_char_items(map: &HashMap<char, u32>, limit: usize) -> Vec<KeyValuePair> {
        let mut items: Vec<_> = map.iter().map(|(k, &v)| (*k, v)).collect();
        items.sort_by(|a, b| b.1.cmp(&a.1));
        items.into_iter()
            .take(limit)
            .map(|(k, v)| KeyValuePair { key: k.to_string(), value: v })
            .collect()
    }

    fn get_top_string_items(map: &HashMap<String, u32>, limit: usize) -> Vec<KeyValuePair> {
        let mut items: Vec<_> = map.iter().map(|(k, &v)| (k.clone(), v)).collect();
        items.sort_by(|a, b| b.1.cmp(&a.1));
        items.into_iter()
            .take(limit)
            .map(|(k, v)| KeyValuePair { key: k, value: v })
            .collect()
    }

    fn generate_recommendations(&self, wpm: f64, accuracy: f64) -> Result<Vec<String>> {
        let mut recommendations = Vec::new();

        if wpm < 40.0 {
            recommendations.push("Focus on building speed with regular practice".to_string());
        } else if wpm > 80.0 {
            recommendations.push("Excellent speed! Maintain consistency".to_string());
        }

        if accuracy < 90.0 {
            recommendations.push("Work on accuracy - slow down if needed".to_string());
        } else if accuracy > 98.0 {
            recommendations.push("Outstanding accuracy! You can try increasing speed".to_string());
        }

        if recommendations.is_empty() {
            recommendations.push("Keep practicing to maintain your skills".to_string());
        }

        Ok(recommendations)
    }

    #[napi]
    pub fn optimize_memory(&self) -> Result<MemoryOptimizationResult> {
        let mut pool = self.memory_pool.lock().unwrap();
        pool.optimize()
    }

    #[napi]
    pub fn allocate_buffer(&self, size: u32) -> Result<Buffer> {
        let mut pool = self.memory_pool.lock().unwrap();
        pool.allocate_buffer(size as usize)
    }

    #[napi]
    pub fn start_performance_monitoring(&self, interval_ms: u32) -> Result<()> {
        self.system_monitor.start_monitoring(interval_ms)
    }

    #[napi]
    pub fn stop_performance_monitoring(&self) -> Result<()> {
        self.system_monitor.stop_monitoring()
    }

    #[napi]
    pub fn get_performance_metrics(&self) -> Result<PerformanceMetrics> {
        self.system_monitor.get_performance_metrics()
    }
}

#[napi(object)]
pub struct TypingEvent {
    pub text: String,
    pub duration_ms: u32,
    pub backspaces: u32,
    pub corrections: u32,
    pub timestamp: f64,
}

#[napi(object)]
pub struct EventAnalysis {
    pub wpm: f64,
    pub accuracy: f64,
    pub errors: u32,
}

#[napi(object)]
pub struct TypingAnalysis {
    pub average_wpm: f64,
    pub average_accuracy: f64,
    pub total_errors: u32,
    pub total_events: u32,
    pub pattern_analysis: PatternAnalysis,
    pub recommendations: Vec<String>,
}

#[napi(object)]
pub struct KeyValuePair {
    pub key: String,
    pub value: u32,
}

#[napi(object)]
pub struct PatternAnalysis {
    pub common_chars: Vec<KeyValuePair>,
    pub common_bigrams: Vec<KeyValuePair>,
    pub error_patterns: Vec<KeyValuePair>,
}

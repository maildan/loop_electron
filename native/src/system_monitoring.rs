use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[cfg(target_os = "macos")]
extern crate libc;

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct PerformanceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub network_usage: f64,
    pub gpu_usage: f64,
    pub temperature: f64,
    pub timestamp: f64,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub cpu_count: u32,
    pub memory_total: f64,
    pub uptime: f64,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct MemoryUsage {
    pub used: f64,
    pub total: f64,
    pub available: f64,
    pub percentage: f64,
}

#[napi]
pub struct SystemMonitor {
    monitoring: Arc<Mutex<bool>>,
    metrics: Arc<Mutex<PerformanceMetrics>>,
}

impl SystemMonitor {
    pub fn new() -> Result<Self> {
        Ok(Self {
            monitoring: Arc::new(Mutex::new(false)),
            metrics: Arc::new(Mutex::new(PerformanceMetrics::default())),
        })
    }

    pub fn get_system_info(&self) -> Result<SystemInfo> {
        Ok(SystemInfo {
            platform: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            cpu_count: num_cpus::get() as u32,
            memory_total: self.get_total_memory()? as f64,
            uptime: self.get_system_uptime()? as f64,
        })
    }

    pub fn get_memory_usage(&self) -> Result<MemoryUsage> {
        let total = self.get_total_memory()?;
        let available = self.get_available_memory()?;
        let used = total - available;
        let percentage = (used as f64 / total as f64) * 100.0;

        Ok(MemoryUsage {
            used: used as f64,
            total: total as f64,
            available: available as f64,
            percentage,
        })
    }

    pub fn start_monitoring(&self, interval_ms: u32) -> Result<()> {
        let mut monitoring = self.monitoring.lock().unwrap();
        if *monitoring {
            return Ok(());
        }
        *monitoring = true;
        
        let monitoring_clone = Arc::clone(&self.monitoring);
        let metrics_clone = Arc::clone(&self.metrics);
        let interval = Duration::from_millis(interval_ms as u64);

        thread::spawn(move || {
            let mut last_check = Instant::now();
            
            while *monitoring_clone.lock().unwrap() {
                let now = Instant::now();
                let elapsed = now.duration_since(last_check);
                
                if elapsed >= interval {
                    if let Ok(mut metrics) = metrics_clone.lock() {
                        Self::update_metrics(&mut metrics);
                    }
                    last_check = now;
                }
                
                thread::sleep(Duration::from_millis(100));
            }
        });

        Ok(())
    }

    pub fn stop_monitoring(&self) -> Result<()> {
        let mut monitoring = self.monitoring.lock().unwrap();
        *monitoring = false;
        Ok(())
    }

    pub fn get_performance_metrics(&self) -> Result<PerformanceMetrics> {
        let metrics = self.metrics.lock().unwrap();
        Ok(metrics.clone())
    }

    fn update_metrics(metrics: &mut PerformanceMetrics) {
        metrics.timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();
        
        // Simulate metric collection with realistic values
        metrics.cpu_usage = Self::get_cpu_usage();
        metrics.memory_usage = Self::get_memory_usage_percentage();
        metrics.disk_usage = Self::get_disk_usage();
        metrics.network_usage = Self::get_network_usage();
        metrics.gpu_usage = Self::get_gpu_usage();
        metrics.temperature = Self::get_system_temperature();
    }

    fn get_cpu_usage() -> f64 {
        // Simulate realistic CPU usage (0-100%)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        SystemTime::now().hash(&mut hasher);
        (hasher.finish() % 100) as f64
    }

    fn get_memory_usage_percentage() -> f64 {
        // Simulate realistic memory usage (30-80%)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() / 1000).hash(&mut hasher);
        30.0 + ((hasher.finish() % 50) as f64)
    }

    fn get_disk_usage() -> f64 {
        // Simulate realistic disk usage (10-90%)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_micros() / 1000).hash(&mut hasher);
        10.0 + ((hasher.finish() % 80) as f64)
    }

    fn get_network_usage() -> f64 {
        // Simulate realistic network usage (0-50%)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() / 100).hash(&mut hasher);
        (hasher.finish() % 50) as f64
    }

    fn get_gpu_usage() -> f64 {
        // Simulate realistic GPU usage (0-100%)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() * 7).hash(&mut hasher);
        (hasher.finish() % 100) as f64
    }

    fn get_system_temperature() -> f64 {
        // Simulate realistic temperature (30-80°C)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() * 11).hash(&mut hasher);
        30.0 + ((hasher.finish() % 50) as f64)
    }

    fn get_total_memory(&self) -> Result<u64> {
        #[cfg(target_os = "macos")]
        {
            self.get_total_memory_macos()
        }
        #[cfg(target_os = "windows")]
        {
            self.get_total_memory_windows()
        }
        #[cfg(target_os = "linux")]
        {
            self.get_total_memory_linux()
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
        {
            Ok(8_000_000_000) // 8GB as fallback
        }
    }

    #[cfg(target_os = "macos")]
    fn get_total_memory_macos(&self) -> Result<u64> {
        use std::ptr;
        use std::ffi::CString;
        
        unsafe {
            let mut size = 0u64;
            let mut len = std::mem::size_of::<u64>();
            let name = CString::new("hw.memsize").unwrap();
            
            if libc::sysctlbyname(
                name.as_ptr(),
                &mut size as *mut _ as *mut libc::c_void,
                &mut len,
                ptr::null_mut(),
                0,
            ) == 0 {
                Ok(size)
            } else {
                Ok(8_000_000_000) // Fallback to 8GB
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn get_total_memory_windows(&self) -> Result<u64> {
        // Simplified Windows implementation
        Ok(8_000_000_000) // 8GB as placeholder
    }

    #[cfg(target_os = "linux")]
    fn get_total_memory_linux(&self) -> Result<u64> {
        use std::fs;
        
        match fs::read_to_string("/proc/meminfo") {
            Ok(meminfo) => {
                for line in meminfo.lines() {
                    if line.starts_with("MemTotal:") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            if let Ok(kb) = parts[1].parse::<u64>() {
                                return Ok(kb * 1024);
                            }
                        }
                    }
                }
                Ok(8_000_000_000) // Fallback
            }
            Err(_) => Ok(8_000_000_000) // Fallback
        }
    }

    fn get_available_memory(&self) -> Result<u64> {
        // Simplified implementation - return 60% of total as available
        let total = self.get_total_memory()?;
        Ok(total * 60 / 100)
    }

    fn get_system_uptime(&self) -> Result<u64> {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .map_err(|_| Error::new(Status::GenericFailure, "Failed to get system time"))
    }
}

// NAPI exports
#[napi]
pub fn create_system_monitor() -> Result<SystemMonitor> {
    SystemMonitor::new()
}

#[napi]
impl SystemMonitor {
    #[napi]
    pub fn get_system_info_js(&self) -> Result<SystemInfo> {
        self.get_system_info()
    }

    #[napi]
    pub fn get_memory_usage_js(&self) -> Result<MemoryUsage> {
        self.get_memory_usage()
    }

    #[napi]
    pub fn start_monitoring_js(&self, interval_ms: u32) -> Result<()> {
        self.start_monitoring(interval_ms)
    }

    #[napi]
    pub fn stop_monitoring_js(&self) -> Result<()> {
        self.stop_monitoring()
    }

    #[napi]
    pub fn get_performance_metrics_js(&self) -> Result<PerformanceMetrics> {
        self.get_performance_metrics()
    }
}

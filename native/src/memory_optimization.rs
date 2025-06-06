use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::VecDeque;

// Global memory allocator using jemalloc for better performance
#[global_allocator]
static ALLOC: jemallocator::Jemalloc = jemallocator::Jemalloc;

pub struct MemoryPool {
    buffers: VecDeque<Vec<u8>>,
    max_pool_size: usize,
    allocated_memory: usize,
    max_memory_limit: usize,
}

impl MemoryPool {
    pub fn new() -> Self {
        Self {
            buffers: VecDeque::new(),
            max_pool_size: 100,
            allocated_memory: 0,
            max_memory_limit: 100 * 1024 * 1024, // 100MB limit
        }
    }

    pub fn allocate_buffer(&mut self, size: usize) -> Result<Buffer> {
        // Check memory limits
        if self.allocated_memory + size > self.max_memory_limit {
            self.cleanup_old_buffers();
        }

        // Try to reuse existing buffer
        if let Some(mut buffer) = self.buffers.pop_front() {
            if buffer.len() >= size {
                buffer.truncate(size);
                return Ok(Buffer::from(buffer));
            }
        }

        // Allocate new buffer
        let buffer = vec![0u8; size];
        self.allocated_memory += size;

        Ok(Buffer::from(buffer))
    }

    pub fn return_buffer(&mut self, buffer: Vec<u8>) {
        if self.buffers.len() < self.max_pool_size {
            self.buffers.push_back(buffer);
        } else {
            self.allocated_memory = self.allocated_memory.saturating_sub(buffer.len());
        }
    }

    pub fn optimize(&mut self) -> Result<MemoryOptimizationResult> {
        let initial_memory = self.allocated_memory;
        let initial_buffers = self.buffers.len();

        // Remove unused buffers
        self.cleanup_old_buffers();

        // Compact remaining buffers
        self.compact_buffers();

        let final_memory = self.allocated_memory;
        let final_buffers = self.buffers.len();

        Ok(MemoryOptimizationResult {
            memory_freed: (initial_memory - final_memory) as u32,
            buffers_cleaned: (initial_buffers - final_buffers) as u32,
            current_memory_usage: final_memory as u32,
            optimization_success: true,
        })
    }

    fn cleanup_old_buffers(&mut self) {
        // Remove buffers that haven't been used recently
        let target_size = self.max_pool_size / 2;
        while self.buffers.len() > target_size {
            if let Some(buffer) = self.buffers.pop_back() {
                self.allocated_memory = self.allocated_memory.saturating_sub(buffer.len());
            }
        }
    }

    fn compact_buffers(&mut self) {
        // Sort buffers by size for better reuse
        let mut buffers: Vec<_> = self.buffers.drain(..).collect();
        buffers.sort_by_key(|b| b.len());
        self.buffers.extend(buffers);
    }

    pub fn get_memory_usage(&self) -> MemoryUsageDetails {
        MemoryUsageDetails {
            allocated_memory: self.allocated_memory as u32,
            buffer_count: self.buffers.len() as u32,
            memory_limit: self.max_memory_limit as u32,
            pool_utilization: (self.buffers.len() as f64 / self.max_pool_size as f64 * 100.0) as u32,
        }
    }
}

#[napi(object)]
pub struct MemoryOptimizationResult {
    pub memory_freed: u32,
    pub buffers_cleaned: u32,
    pub current_memory_usage: u32,
    pub optimization_success: bool,
}

#[napi(object)]
pub struct MemoryUsageDetails {
    pub allocated_memory: u32,
    pub buffer_count: u32,
    pub memory_limit: u32,
    pub pool_utilization: u32,
}

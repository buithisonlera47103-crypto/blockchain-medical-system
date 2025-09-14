/**
 * Streaming Service for Large File Operations
 * Handles memory-efficient file uploads and downloads
 */

import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { Readable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import * as zlib from 'zlib';

import logger from '../../utils/enhancedLogger';
import { MetricsService } from '../MetricsService';

const pipelineAsync = promisify(pipeline);

export interface StreamOptions {
  chunkSize?: number;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  generateChecksum?: boolean;
  compress?: boolean;
  encrypt?: boolean;
}

export interface StreamProgress {
  bytesProcessed: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
}

export interface StreamResult {
  success: boolean;
  bytesProcessed: number;
  checksum?: string;
  duration: number;
  error?: string;
}

export class StreamingService {
  private readonly logger: typeof logger;
  private readonly metrics: MetricsService;
  private readonly defaultChunkSize = 64 * 1024; // 64KB chunks
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB default limit

  constructor(metricsService?: MetricsService) {
    this.logger = logger;
    this.metrics = metricsService ?? MetricsService.getInstance();
  }

  /**
   * Stream file upload with progress tracking and validation
   */
  async streamUpload(
    inputStream: Readable,
    outputPath: string,
    options: StreamOptions = {},
    progressCallback?: (progress: StreamProgress) => void
  ): Promise<StreamResult> {
    const startTime = Date.now();
    let bytesProcessed = 0;
    let checksum: string | undefined;

    try {
      // Validate options
      const chunkSize = options.chunkSize ?? this.defaultChunkSize;
      const maxFileSize = options.maxFileSize ?? this.maxFileSize;

      // Create transform streams
      const transforms: Transform[] = [];

      // Size validation transform
      const sizeValidator = new Transform({
        transform(
          this: Transform,
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ): void {
          bytesProcessed += chunk.length;

          if (bytesProcessed > maxFileSize) {
              callback(new Error(`File size exceeds limit of ${maxFileSize} bytes`));
              return;
            }

            callback(null, chunk);
        },
      });
      transforms.push(sizeValidator);

      // Progress tracking transform
      let lastProgressTime = Date.now();
      const progressTracker = new Transform({
        transform(
          this: Transform,
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ): void {
          const now = Date.now();

          if (progressCallback && now - lastProgressTime > 1000) {
            // Update every second
            const duration = (now - startTime) / 1000;
            const speed = bytesProcessed / duration;
            const estimatedTotal = bytesProcessed; // We don't know total size for streams

            progressCallback({
              bytesProcessed,
              totalBytes: estimatedTotal,
              percentage: 0, // Unknown for streams
              speed,
              estimatedTimeRemaining: 0,
            });

            lastProgressTime = now;
          }

          callback(null, chunk);
        },
      });
      transforms.push(progressTracker);

      // Checksum calculation transform
      let hasher: crypto.Hash | undefined;
      if (options.generateChecksum) {
        hasher = createHash('sha256');
        const checksumCalculator = new Transform({
          transform(
          this: Transform,
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ): void {
            if (hasher) {
              hasher.update(chunk);
            }
            callback(null, chunk);
          },
        });
        transforms.push(checksumCalculator);
      }

      // MIME type validation transform (if we can detect it)
      if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
        const mimeValidator = new Transform({
          objectMode: false,
          transform(
          this: Transform,
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ): void {
            // Simple magic number detection for common types
            if (bytesProcessed === chunk.length) {
              // First chunk - use static method for MIME type detection
              const mimeType = StreamingService.detectMimeTypeStatic(chunk);
              if (mimeType && options.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
                callback(new Error(`File type ${mimeType} not allowed`));
                return;
              }
            }
            callback(null, chunk);
          },
        });
        transforms.push(mimeValidator);
      }

      // Compression transform (if enabled)
      if (options.compress) {
        transforms.push(zlib.createGzip());
      }

      // Encryption transform (if enabled)
      if (options.encrypt) {
        const encryptionTransform = this.createEncryptionTransform();
        transforms.push(encryptionTransform);
      }

      // Output stream
      const outputStream = createWriteStream(outputPath, {
        highWaterMark: chunkSize,
      });

      // Create pipeline
      const streams = [inputStream, ...transforms, outputStream];
      await pipelineAsync(
        ...(streams as unknown as [NodeJS.ReadableStream, NodeJS.WritableStream])
      );

      // Calculate final checksum
      if (hasher) {
        checksum = hasher.digest('hex');
      }

      const duration = Date.now() - startTime;

      // Record metrics
      this.metrics.recordFileOperation('upload', bytesProcessed, duration);

      this.logger.info('File upload completed', {
        outputPath,
        bytesProcessed,
        duration,
        checksum,
      });

      return {
        success: true,
        bytesProcessed,
        checksum,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('File upload failed', {
        outputPath,
        bytesProcessed,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      // Clean up partial file
      try {
        await fs.unlink(outputPath);
      } catch (cleanupError) {
        this.logger.warn('Failed to clean up partial file', {
          outputPath,
          cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }

      return {
        success: false,
        bytesProcessed,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stream file download with range support
   */
  async streamDownload(
    filePath: string,
    outputStream: NodeJS.WritableStream,
    options: {
      start?: number;
      end?: number;
      chunkSize?: number;
    } = {}
  ): Promise<StreamResult> {
    const startTime = Date.now();
    let bytesProcessed = 0;

    try {
      // Check if file exists
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Validate range
      const start = options.start ?? 0;
      const end = options.end ?? fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        throw new Error('Invalid range specified');
      }

      const chunkSize = options.chunkSize ?? this.defaultChunkSize;

      // Create read stream with range
      const inputStream = createReadStream(filePath, {
        start,
        end,
        highWaterMark: chunkSize,
      });

      // Progress tracking transform
      const progressTracker = new Transform({
        transform(
          this: Transform,
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ): void {
          bytesProcessed += chunk.length;
          callback(null, chunk);
        },
      });

      // Create pipeline
      await pipelineAsync(inputStream, progressTracker, outputStream);

      const duration = Date.now() - startTime;

      // Record metrics
      this.metrics.recordFileOperation('download', bytesProcessed, duration);

      this.logger.info('File download completed', {
        filePath,
        bytesProcessed,
        duration,
        range: { start, end },
      });

      return {
        success: true,
        bytesProcessed,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('File download failed', {
        filePath,
        bytesProcessed,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        bytesProcessed,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stream file processing (e.g., format conversion, compression)
   */
  async processFile(
    inputPath: string,
    outputPath: string,
    processor: (inputStream: Readable) => Transform,
    options: StreamOptions = {}
  ): Promise<StreamResult> {
    const startTime = Date.now();
    let bytesProcessed = 0;

    try {
      const chunkSize = options.chunkSize ?? this.defaultChunkSize;

      // Create streams
      const inputStream = createReadStream(inputPath, { highWaterMark: chunkSize });
      const outputStream = createWriteStream(outputPath, { highWaterMark: chunkSize });
      const processingTransform = processor(inputStream);

      // Progress tracking
      const progressTracker = new Transform({
        transform(
          this: Transform,
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ): void {
          bytesProcessed += chunk.length;
          callback(null, chunk);
        },
      });

      // Create pipeline
      await pipelineAsync(inputStream, processingTransform, progressTracker, outputStream);

      const duration = Date.now() - startTime;

      this.logger.info('File processing completed', {
        inputPath,
        outputPath,
        bytesProcessed,
        duration,
      });

      return {
        success: true,
        bytesProcessed,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('File processing failed', {
        inputPath,
        outputPath,
        bytesProcessed,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        bytesProcessed,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a transform stream for file encryption
   */
  private createEncryptionTransform(): Transform {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(
      process.env['ENCRYPTION_KEY'] ?? 'default-key-32-chars-long-here!',
      'utf8'
    );

    const cipher = crypto.createCipher(algorithm, key);

    return new Transform({
      transform(
        this: Transform,
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null, data?: unknown) => void
      ): void {
        try {
          const encrypted = cipher.update(chunk);
          callback(null, encrypted);
        } catch (error) {
          callback(error as Error);
        }
      },
      flush(callback: (error?: Error | null, data?: unknown) => void): void {
        try {
          const final = cipher.final();
          callback(null, final);
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  }

  /**
   * Simple MIME type detection based on magic numbers
   */
  private static detectMimeTypeStatic(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    // PDF
    if (buffer.toString('ascii', 0, 4) === '%PDF') {
      return 'application/pdf';
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }

    // ZIP/DOCX
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return 'application/zip';
    }

    return null;
  }

  /**
   * Calculate optimal chunk size based on file size and available memory
   */
  calculateOptimalChunkSize(fileSize: number, availableMemory: number): number {
    const minChunkSize = 8 * 1024; // 8KB
    const maxChunkSize = 1024 * 1024; // 1MB

    // Use 1% of available memory or 1/1000 of file size, whichever is smaller
    const memoryBasedSize = Math.floor(availableMemory * 0.01);
    const fileSizeBasedSize = Math.floor(fileSize / 1000);

    const optimalSize = Math.min(memoryBasedSize, fileSizeBasedSize);

    // Clamp to min/max bounds
    return Math.max(minChunkSize, Math.min(maxChunkSize, optimalSize));
  }
}

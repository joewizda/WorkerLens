import type { Multer } from "multer";

/** 
 * Multer File interface extension for Express Request
 * Example of req.file object:
 * {
 *    fieldname: 'file',             // Form field name
 *    originalname: 'interview.mp3', // Original filename
 *    encoding: '7bit',              // File encoding
 *    mimetype: 'audio/mpeg',        // MIME type
 *    destination: '/tmp',           // Upload directory (from multer config)
 *    filename: 'abc123.mp3',        // Generated filename
 *    path: '/tmp/abc123.mp3',       // Full path to uploaded file
 *    size: 5242880                  // File size in bytes
 *}
*/
declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: Multer.File[];
    }
  }
}

export {};
package com.edugame.asset.dto;

/**
 * An uploaded file.
 *
 * @param url       path to show it from, relative to the API host, e.g. {@code /api/v1/assets/Xy3...Q.png}; this
 *                  is what a question stores in its {@code image} field
 * @param name      the file name the teacher picked
 * @param type      {@code IMAGE}
 * @param mimeType  read from the file itself, e.g. {@code image/png}
 * @param sizeBytes size of the stored file
 */
public record AssetResponse(Long id, String url, String name, String type, String mimeType, long sizeBytes) {
}

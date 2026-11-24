package com.mithran.reference;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Jothidam Reference Guide metadata endpoint.
 *
 * Serves the exact bilingual dataset used by the Mithran Predictions UI
 * (app/data/jothidam-reference-data.js / src/data/jothidam-reference-data.ts),
 * so the guide and the prediction rule engine share one single source of truth.
 *
 * Endpoint: GET /api/v1/reference/metadata
 * Response: application/json — 12 Rasi dignities (Aatchi/Ucham/Neecham with
 * Paramocham & Paramoneecham degrees), 27 Nakshatras with Vimshottari star
 * lords and 13°20' spans, and the 12 Bhava responsibilities directory.
 */
@RestController
@RequestMapping("/api/v1/reference")
public class ReferenceMetadataController {

    private static final String METADATA_RESOURCE = "jothidam-reference-metadata.json";

    @GetMapping(value = "/metadata", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getMetadata() {
        try (InputStream in = new ClassPathResource(METADATA_RESOURCE).getInputStream()) {
            String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=86400")
                    .body(json);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body("{\"error\":\"reference metadata resource not found: " + METADATA_RESOURCE + "\"}");
        }
    }
}

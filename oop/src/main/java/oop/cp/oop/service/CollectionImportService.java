package oop.cp.oop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import oop.cp.oop.dto.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CollectionImportService {

    private final ObjectMapper objectMapper;

    public CollectionImportService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CollectionImportResponse parse(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode itemsNode = root.path("item");
            if (!itemsNode.isArray()) {
                throw new IllegalArgumentException("Invalid Postman collection: `item` array is missing.");
            }

            List<CollectionRequestDto> requests = flattenCollectionItems(itemsNode, "");
            if (requests.isEmpty()) {
                throw new IllegalArgumentException("Collection imported, but no request endpoints were found.");
            }

            JsonNode infoNode = root.path("info");
            CollectionMetaDto meta = new CollectionMetaDto(
                    textOrDefault(infoNode.path("name"), "Imported Collection"),
                    textOrDefault(infoNode.path("schema"), "Unknown schema"),
                    textOrDefault(infoNode.path("description"), "")
            );

            Map<String, Integer> methods = new LinkedHashMap<>();
            Set<String> folders = new HashSet<>();
            for (CollectionRequestDto request : requests) {
                methods.merge(request.method(), 1, Integer::sum);
                if (request.folder() != null && !request.folder().isBlank()) {
                    folders.add(request.folder());
                }
            }

            CollectionStatsDto stats = new CollectionStatsDto(
                    requests.size(),
                    methods,
                    folders.size()
            );

            return new CollectionImportResponse(meta, stats, requests);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException(ex.getMessage() == null ? "Failed to parse uploaded collection file." : ex.getMessage());
        }
    }

    private List<CollectionRequestDto> flattenCollectionItems(JsonNode items, String folderPrefix) {
        List<CollectionRequestDto> requests = new ArrayList<>();
        for (JsonNode entry : items) {
            JsonNode nestedItems = entry.path("item");
            if (nestedItems.isArray()) {
                String folderName = textOrDefault(entry.path("name"), "Folder");
                String nextFolder = folderPrefix.isBlank() ? folderName : folderPrefix + " / " + folderName;
                requests.addAll(flattenCollectionItems(nestedItems, nextFolder));
                continue;
            }

            JsonNode requestNode = entry.path("request");
            String method = textOrDefault(requestNode.path("method"), "GET").toUpperCase(Locale.ROOT);
            String name = textOrDefault(entry.path("name"), "Untitled Request");
            String url = buildRawUrl(requestNode.path("url"));

            List<CollectionHeaderDto> headers = new ArrayList<>();
            JsonNode headerArray = requestNode.path("header");
            if (headerArray.isArray()) {
                for (JsonNode header : headerArray) {
                    String key = textOrDefault(header.path("key"), "");
                    if (!key.isBlank()) {
                        headers.add(new CollectionHeaderDto(key, textOrDefault(header.path("value"), "")));
                    }
                }
            }

            List<CollectionQueryParamDto> queryParams = new ArrayList<>();
            JsonNode urlNode = requestNode.path("url");
            JsonNode queryArray = urlNode.path("query");
            if (queryArray.isArray()) {
                for (JsonNode query : queryArray) {
                    String key = textOrDefault(query.path("key"), "");
                    if (!key.isBlank()) {
                        queryParams.add(new CollectionQueryParamDto(
                                key,
                                textOrDefault(query.path("value"), ""),
                                textOrDefault(query.path("description"), ""),
                                query.path("disabled").asBoolean(false)
                        ));
                    }
                }
            }

            String body = textOrDefault(requestNode.path("body").path("raw"), "");
            if (body.isBlank()) {
                body = textOrDefault(requestNode.path("body").path("graphql").path("query"), "");
            }

            List<CollectionResponseExampleDto> responses = new ArrayList<>();
            JsonNode responseArray = entry.path("response");
            if (responseArray.isArray()) {
                for (JsonNode response : responseArray) {
                    Integer code = response.hasNonNull("code") ? response.path("code").asInt() : null;
                    String status = textOrDefault(response.path("status"), "");
                    String responseName = textOrDefault(response.path("name"), "");
                    if (responseName.isBlank()) {
                        responseName = !status.isBlank() ? status : (code == null ? "Response" : "HTTP " + code);
                    }

                    List<CollectionHeaderDto> responseHeaders = new ArrayList<>();
                    JsonNode responseHeaderArray = response.path("header");
                    if (responseHeaderArray.isArray()) {
                        for (JsonNode header : responseHeaderArray) {
                            String key = textOrDefault(header.path("key"), "");
                            if (!key.isBlank()) {
                                responseHeaders.add(new CollectionHeaderDto(key, textOrDefault(header.path("value"), "")));
                            }
                        }
                    }

                    responses.add(new CollectionResponseExampleDto(
                            responseName,
                            code,
                            status,
                            stringifyBody(response.path("body")),
                            responseHeaders
                    ));
                }
            }

            String description = textOrDefault(entry.path("description"), textOrDefault(requestNode.path("description"), ""));
            requests.add(new CollectionRequestDto(
                    UUID.randomUUID().toString(),
                    name,
                    folderPrefix,
                    method,
                    url,
                    headers,
                    body,
                    description,
                    queryParams,
                    responses
            ));
        }

        return requests;
    }

    private String buildRawUrl(JsonNode urlNode) {
        if (urlNode == null || urlNode.isMissingNode() || urlNode.isNull()) {
            return "";
        }

        if (urlNode.isTextual()) {
            return urlNode.asText();
        }

        String raw = textOrDefault(urlNode.path("raw"), "");
        if (!raw.isBlank()) {
            return raw;
        }

        String protocol = textOrDefault(urlNode.path("protocol"), "");
        String protocolPrefix = protocol.isBlank() ? "" : protocol + "://";

        String host;
        JsonNode hostNode = urlNode.path("host");
        if (hostNode.isArray()) {
            List<String> parts = new ArrayList<>();
            for (JsonNode part : hostNode) {
                String value = textOrDefault(part, "");
                if (!value.isBlank()) {
                    parts.add(value);
                }
            }
            host = String.join(".", parts);
        } else {
            host = textOrDefault(hostNode, "");
        }

        String path = "";
        JsonNode pathNode = urlNode.path("path");
        if (pathNode.isArray()) {
            List<String> segments = new ArrayList<>();
            for (JsonNode segment : pathNode) {
                String value = textOrDefault(segment, "");
                if (!value.isBlank()) {
                    segments.add(value);
                }
            }
            if (!segments.isEmpty()) {
                path = "/" + String.join("/", segments);
            }
        } else {
            String pathValue = textOrDefault(pathNode, "");
            if (!pathValue.isBlank()) {
                path = pathValue.startsWith("/") ? pathValue : "/" + pathValue;
            }
        }

        StringBuilder queryBuilder = new StringBuilder();
        JsonNode queryNode = urlNode.path("query");
        if (queryNode.isArray()) {
            for (JsonNode query : queryNode) {
                String key = textOrDefault(query.path("key"), "");
                if (key.isBlank()) {
                    continue;
                }
                String value = textOrDefault(query.path("value"), "");
                if (queryBuilder.length() > 0) {
                    queryBuilder.append('&');
                }
                queryBuilder.append(key).append('=').append(value);
            }
        }

        return protocolPrefix + host + path + (queryBuilder.length() > 0 ? "?" + queryBuilder : "");
    }

    private String stringifyBody(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        if (node.isTextual()) {
            return node.asText();
        }
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
        } catch (Exception ex) {
            return node.toString();
        }
    }

    private String textOrDefault(JsonNode node, String defaultValue) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return defaultValue;
        }
        if (node.isTextual()) {
            return node.asText();
        }
        if (node.isValueNode()) {
            return node.asText(defaultValue);
        }
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
        } catch (Exception ex) {
            return defaultValue;
        }
    }
}

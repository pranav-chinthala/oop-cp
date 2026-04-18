package oop.cp.oop.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeDefinition;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.BillingMode;
import software.amazon.awssdk.services.dynamodb.model.CreateTableRequest;
import software.amazon.awssdk.services.dynamodb.model.DeleteTableRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.ListTablesResponse;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.ResourceInUseException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.awssdk.services.dynamodb.model.ScalarAttributeType;
import software.amazon.awssdk.services.dynamodb.model.KeySchemaElement;
import software.amazon.awssdk.services.dynamodb.model.KeyType;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AwsEmulatorService {

    private final String endpoint;
    private final Region region;
    private final StaticCredentialsProvider credentialsProvider;

    public AwsEmulatorService(
            @Value("${app.aws.localstack.endpoint:http://localhost.localstack.cloud:4566}") String endpoint,
            @Value("${app.aws.region:us-east-1}") String region,
            @Value("${app.aws.access-key:test}") String accessKey,
            @Value("${app.aws.secret-key:test}") String secretKey
    ) {
        this.endpoint = endpoint;
        this.region = Region.of(region);
        this.credentialsProvider = StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
    }

    public Map<String, Object> execute(String service, String action, String resourceName, Map<String, Object> parameters) {
        String normalizedService = normalize(service);
        String normalizedAction = normalize(action);
        Map<String, Object> params = parameters == null ? Collections.emptyMap() : parameters;

        return switch (normalizedService) {
            case "LOCALSTACK" -> handleLocalStackAction(normalizedAction);
            case "S3" -> handleS3Action(normalizedAction, resourceName, params);
            case "DYNAMODB" -> handleDynamoDbAction(normalizedAction, resourceName, params);
            default -> failure("Unsupported service: " + service, Map.of("supported", List.of("LOCALSTACK", "S3", "DYNAMODB")));
        };
    }

    private Map<String, Object> handleLocalStackAction(String action) {
        return switch (action) {
            case "STATUS" -> localStackStatus();
            case "BOOTSTRAP" -> bootstrapResources();
            default -> failure("Unsupported LOCALSTACK action: " + action, Map.of("supported", List.of("STATUS", "BOOTSTRAP")));
        };
    }

    private Map<String, Object> localStackStatus() {
        try (S3Client s3Client = s3Client(); DynamoDbClient dynamoDbClient = dynamoClient()) {
            List<String> bucketNames = s3Client.listBuckets().buckets().stream().map(Bucket::name).toList();
            ListTablesResponse tableResponse = dynamoDbClient.listTables();
            Map<String, Object> output = new LinkedHashMap<>();
            output.put("endpoint", endpoint);
            output.put("region", region.id());
            output.put("buckets", bucketNames);
            output.put("tables", tableResponse.tableNames());
            output.put("checkedAt", Instant.now().toString());
            return success("LocalStack is reachable.", output);
        } catch (Exception exception) {
            return failure("LocalStack is not reachable. Start it with `localstack start`.", Map.of(
                    "endpoint", endpoint,
                    "error", safeMessage(exception)
            ));
        }
    }

    private Map<String, Object> bootstrapResources() {
        try (S3Client s3Client = s3Client(); DynamoDbClient dynamoDbClient = dynamoClient()) {
            List<String> created = new ArrayList<>();
            List<String> existing = new ArrayList<>();

            String bucketName = "records";
            boolean hasBucket = s3Client.listBuckets().buckets().stream().map(Bucket::name).anyMatch(bucketName::equals);
            if (hasBucket) {
                existing.add("S3 bucket: " + bucketName);
            } else {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                created.add("S3 bucket: " + bucketName);
            }

            String tableName = "person";
            boolean hasTable = dynamoDbClient.listTables().tableNames().contains(tableName);
            if (hasTable) {
                existing.add("DynamoDB table: " + tableName);
            } else {
                dynamoDbClient.createTable(CreateTableRequest.builder()
                        .tableName(tableName)
                        .attributeDefinitions(AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build())
                        .keySchema(KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build())
                        .billingMode(BillingMode.PAY_PER_REQUEST)
                        .build());
                created.add("DynamoDB table: " + tableName);
            }

            Map<String, Object> output = new LinkedHashMap<>();
            output.put("created", created);
            output.put("alreadyPresent", existing);
            output.put("endpoint", endpoint);
            return success("Bootstrap completed.", output);
        } catch (Exception exception) {
            return failure("Bootstrap failed.", Map.of("error", safeMessage(exception)));
        }
    }

    private Map<String, Object> handleS3Action(String action, String resourceName, Map<String, Object> parameters) {
        try (S3Client client = s3Client()) {
            return switch (action) {
                case "LIST_BUCKETS" -> {
                    List<String> buckets = client.listBuckets().buckets().stream().map(Bucket::name).toList();
                    yield success("S3 buckets listed.", Map.of("buckets", buckets, "count", buckets.size()));
                }
                case "CREATE_BUCKET" -> {
                    String bucketName = resolveName(resourceName, parameters, "bucketName");
                    client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                    yield success("Bucket created.", Map.of("bucketName", bucketName));
                }
                case "DELETE_BUCKET" -> {
                    String bucketName = resolveName(resourceName, parameters, "bucketName");
                    client.deleteBucket(DeleteBucketRequest.builder().bucket(bucketName).build());
                    yield success("Bucket deleted.", Map.of("bucketName", bucketName));
                }
                case "LIST_OBJECTS" -> {
                    String bucketName = resolveName(resourceName, parameters, "bucketName");
                    List<S3Object> objects = client.listObjectsV2(ListObjectsV2Request.builder().bucket(bucketName).build()).contents();
                    List<Map<String, Object>> entries = objects.stream().map(object -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("key", object.key());
                        item.put("size", object.size());
                        item.put("lastModified", object.lastModified() == null ? "" : object.lastModified().toString());
                        return item;
                    }).toList();
                    yield success("Objects listed.", Map.of("bucketName", bucketName, "objects", entries, "count", entries.size()));
                }
                case "PUT_OBJECT" -> {
                    String bucketName = resolveName(resourceName, parameters, "bucketName");
                    String objectKey = readString(parameters, "key", "object.txt");
                    String content = readString(parameters, "content", "");
                    client.putObject(builder -> builder.bucket(bucketName).key(objectKey), RequestBody.fromString(content, StandardCharsets.UTF_8));
                    yield success("Object uploaded.", Map.of("bucketName", bucketName, "key", objectKey, "bytes", content.getBytes(StandardCharsets.UTF_8).length));
                }
                case "GET_OBJECT" -> {
                    String bucketName = resolveName(resourceName, parameters, "bucketName");
                    String objectKey = readRequiredString(parameters, "key");
                    ResponseBytes<GetObjectResponse> objectBytes = client.getObjectAsBytes(GetObjectRequest.builder().bucket(bucketName).key(objectKey).build());
                    GetObjectResponse response = objectBytes.response();
                    String content = objectBytes.asUtf8String();
                    yield success("Object read.", Map.of(
                            "bucketName", bucketName,
                            "key", objectKey,
                            "size", response.contentLength() == null ? content.length() : response.contentLength(),
                            "content", content
                    ));
                }
                case "DELETE_OBJECT" -> {
                    String bucketName = resolveName(resourceName, parameters, "bucketName");
                    String objectKey = readRequiredString(parameters, "key");
                    client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(objectKey).build());
                    yield success("Object deleted.", Map.of("bucketName", bucketName, "key", objectKey));
                }
                default -> failure("Unsupported S3 action: " + action, Map.of("supported", List.of(
                        "LIST_BUCKETS", "CREATE_BUCKET", "DELETE_BUCKET", "LIST_OBJECTS", "PUT_OBJECT", "GET_OBJECT", "DELETE_OBJECT"
                )));
            };
        } catch (NoSuchBucketException exception) {
            return failure("S3 bucket not found.", Map.of("error", safeMessage(exception)));
        } catch (NoSuchKeyException exception) {
            return failure("S3 object key not found.", Map.of("error", safeMessage(exception)));
        } catch (IllegalArgumentException exception) {
            return failure(exception.getMessage() == null ? "Invalid request." : exception.getMessage(), Map.of());
        } catch (Exception exception) {
            return failure("S3 operation failed.", Map.of("error", safeMessage(exception)));
        }
    }

    private Map<String, Object> handleDynamoDbAction(String action, String resourceName, Map<String, Object> parameters) {
        try (DynamoDbClient client = dynamoClient()) {
            return switch (action) {
                case "LIST_TABLES" -> {
                    List<String> tableNames = client.listTables().tableNames();
                    yield success("DynamoDB tables listed.", Map.of("tables", tableNames, "count", tableNames.size()));
                }
                case "CREATE_TABLE" -> {
                    String tableName = resolveName(resourceName, parameters, "tableName");
                    String partitionKey = readString(parameters, "partitionKey", "id");
                    client.createTable(CreateTableRequest.builder()
                            .tableName(tableName)
                            .attributeDefinitions(AttributeDefinition.builder().attributeName(partitionKey).attributeType(ScalarAttributeType.S).build())
                            .keySchema(KeySchemaElement.builder().attributeName(partitionKey).keyType(KeyType.HASH).build())
                            .billingMode(BillingMode.PAY_PER_REQUEST)
                            .build());
                    yield success("DynamoDB table created.", Map.of("tableName", tableName, "partitionKey", partitionKey));
                }
                case "DELETE_TABLE" -> {
                    String tableName = resolveName(resourceName, parameters, "tableName");
                    client.deleteTable(DeleteTableRequest.builder().tableName(tableName).build());
                    yield success("DynamoDB table deleted.", Map.of("tableName", tableName));
                }
                case "PUT_ITEM" -> {
                    String tableName = resolveName(resourceName, parameters, "tableName");
                    Map<String, Object> item = readObjectMap(parameters, "item");
                    client.putItem(PutItemRequest.builder().tableName(tableName).item(toAttributeMap(item)).build());
                    yield success("Item inserted/updated.", Map.of("tableName", tableName, "item", item));
                }
                case "GET_ITEM" -> {
                    String tableName = resolveName(resourceName, parameters, "tableName");
                    Map<String, Object> keyMap = readObjectMap(parameters, "key");
                    Map<String, AttributeValue> key = toAttributeMap(keyMap);
                    Map<String, AttributeValue> item = client.getItem(GetItemRequest.builder().tableName(tableName).key(key).build()).item();
                    Map<String, Object> result = fromAttributeMap(item);
                    yield success(item == null || item.isEmpty() ? "Item not found." : "Item retrieved.", Map.of(
                            "tableName", tableName,
                            "key", keyMap,
                            "item", result
                    ));
                }
                default -> failure("Unsupported DYNAMODB action: " + action, Map.of("supported", List.of(
                        "LIST_TABLES", "CREATE_TABLE", "DELETE_TABLE", "PUT_ITEM", "GET_ITEM"
                )));
            };
        } catch (ResourceInUseException exception) {
            return failure("Table already exists.", Map.of("error", safeMessage(exception)));
        } catch (ResourceNotFoundException exception) {
            return failure("DynamoDB resource not found.", Map.of("error", safeMessage(exception)));
        } catch (IllegalArgumentException exception) {
            return failure(exception.getMessage() == null ? "Invalid request." : exception.getMessage(), Map.of());
        } catch (Exception exception) {
            return failure("DynamoDB operation failed.", Map.of("error", safeMessage(exception)));
        }
    }

    private S3Client s3Client() {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(region)
                .forcePathStyle(true)
                .credentialsProvider(credentialsProvider)
                .build();
    }

    private DynamoDbClient dynamoClient() {
        return DynamoDbClient.builder()
                .endpointOverride(URI.create(endpoint))
                .region(region)
                .credentialsProvider(credentialsProvider)
                .build();
    }

    private static Map<String, AttributeValue> toAttributeMap(Map<String, Object> map) {
        Map<String, AttributeValue> attributes = new HashMap<>();
        map.forEach((key, value) -> attributes.put(key, toAttributeValue(value)));
        return attributes;
    }

    private static AttributeValue toAttributeValue(Object value) {
        if (value == null) {
            return AttributeValue.builder().nul(true).build();
        }
        if (value instanceof Number number) {
            return AttributeValue.builder().n(String.valueOf(number)).build();
        }
        if (value instanceof Boolean bool) {
            return AttributeValue.builder().bool(bool).build();
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, AttributeValue> nested = new HashMap<>();
            map.forEach((k, v) -> nested.put(String.valueOf(k), toAttributeValue(v)));
            return AttributeValue.builder().m(nested).build();
        }
        if (value instanceof List<?> list) {
            List<AttributeValue> nestedList = list.stream().map(AwsEmulatorService::toAttributeValue).toList();
            return AttributeValue.builder().l(nestedList).build();
        }
        return AttributeValue.builder().s(String.valueOf(value)).build();
    }

    private static Map<String, Object> fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) return Collections.emptyMap();
        Map<String, Object> result = new LinkedHashMap<>();
        map.forEach((key, value) -> result.put(key, fromAttributeValue(value)));
        return result;
    }

    private static Object fromAttributeValue(AttributeValue value) {
        if (value.s() != null) return value.s();
        if (value.n() != null) return value.n();
        if (value.bool() != null) return value.bool();
        if (Boolean.TRUE.equals(value.nul())) return null;
        if (value.hasM()) return fromAttributeMap(value.m());
        if (value.hasL()) return value.l().stream().map(AwsEmulatorService::fromAttributeValue).toList();
        return value.toString();
    }

    private static String resolveName(String resourceName, Map<String, Object> parameters, String key) {
        String direct = resourceName == null ? "" : resourceName.trim();
        if (!direct.isEmpty()) return direct;
        String fromParams = readString(parameters, key, "");
        if (!fromParams.isBlank()) return fromParams;
        throw new IllegalArgumentException("`resourceName` or `parameters." + key + "` is required.");
    }

    private static String readRequiredString(Map<String, Object> parameters, String key) {
        String value = readString(parameters, key, "").trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("`parameters." + key + "` is required.");
        }
        return value;
    }

    private static String readString(Map<String, Object> parameters, String key, String defaultValue) {
        Object value = parameters.get(key);
        if (value == null) return defaultValue;
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? defaultValue : text;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readObjectMap(Map<String, Object> parameters, String key) {
        Object value = parameters.get(key);
        if (value == null) {
            throw new IllegalArgumentException("`parameters." + key + "` is required and must be an object.");
        }
        if (!(value instanceof Map<?, ?> valueMap)) {
            throw new IllegalArgumentException("`parameters." + key + "` must be a JSON object.");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        valueMap.forEach((mapKey, mapValue) -> result.put(String.valueOf(mapKey), mapValue));
        return result;
    }

    private static Map<String, Object> success(String message, Map<String, Object> output) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("output", output);
        return response;
    }

    private static Map<String, Object> failure(String message, Map<String, Object> output) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("output", output);
        return response;
    }

    private static String safeMessage(Exception exception) {
        return Objects.requireNonNullElse(exception.getMessage(), exception.getClass().getSimpleName());
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return value.trim().toUpperCase();
    }
}

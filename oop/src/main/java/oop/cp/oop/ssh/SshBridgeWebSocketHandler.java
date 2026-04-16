package oop.cp.oop.ssh;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SshBridgeWebSocketHandler extends TextWebSocketHandler {

    private static final String ANSI_CSI = "\\u001B\\[[0-?]*[ -/]*[@-~]";
    private static final String ANSI_OSC = "\\u001B\\][^\\u0007]*(\\u0007|\\u001B\\\\)";
    private static final String ANSI_SINGLE = "\\u001B[@-_]";

    private final Map<String, SshSessionBridge> sshConnections = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        session.sendMessage(new TextMessage("{\"type\":\"info\",\"message\":\"Connected to SSH bridge\"}"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession webSocketSession, TextMessage message) throws Exception {
        JsonNode payload = objectMapper.readTree(message.getPayload());
        String action = payload.path("action").asText();

        if ("connect".equalsIgnoreCase(action)) {
            connectSsh(webSocketSession, payload);
            return;
        }

        SshSessionBridge bridge = sshConnections.get(webSocketSession.getId());
        if (bridge == null) {
            webSocketSession.sendMessage(new TextMessage("{\"type\":\"error\",\"message\":\"Not connected to SSH host\"}"));
            return;
        }

        if ("input".equalsIgnoreCase(action)) {
            bridge.write(payload.path("data").asText(""));
            return;
        }

        if ("disconnect".equalsIgnoreCase(action)) {
            cleanup(webSocketSession.getId());
            webSocketSession.sendMessage(new TextMessage("{\"type\":\"info\",\"message\":\"SSH session disconnected\"}"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        cleanup(session.getId());
    }

    private void connectSsh(WebSocketSession webSocketSession, JsonNode payload) throws IOException {
        cleanup(webSocketSession.getId());

        String host = payload.path("host").asText();
        int port = payload.path("port").asInt(22);
        String username = payload.path("username").asText();
        String password = payload.path("password").asText();
        String ptyType = payload.path("ptyType").asText("xterm");

        try {
            SshSessionBridge bridge = new SshSessionBridge(host, port, username, password, ptyType);
            sshConnections.put(webSocketSession.getId(), bridge);
            webSocketSession.sendMessage(new TextMessage("{\"type\":\"connected\",\"message\":\"SSH session established\"}"));

            Thread readerThread = new Thread(() -> streamSshOutput(webSocketSession, bridge), "ssh-bridge-" + webSocketSession.getId());
            readerThread.setDaemon(true);
            readerThread.start();
        } catch (Exception ex) {
            webSocketSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                    "type", "error",
                    "message", ex.getMessage() == null ? "Unable to connect" : ex.getMessage()
            ))));
        }
    }

    private void streamSshOutput(WebSocketSession webSocketSession, SshSessionBridge bridge) {
        byte[] buffer = new byte[2048];
        try {
            while (webSocketSession.isOpen() && !bridge.isClosed()) {
                int bytesRead = bridge.read(buffer);
                if (bytesRead < 0) {
                    break;
                }
                if (bytesRead == 0) {
                    continue;
                }
                String data = new String(buffer, 0, bytesRead);
                String cleaned = sanitizeTerminalOutput(data);
                if (cleaned.isBlank()) {
                    continue;
                }
                synchronized (webSocketSession) {
                    webSocketSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                            "type", "output",
                            "data", cleaned
                    ))));
                }
            }
        } catch (Exception ex) {
            try {
                if (webSocketSession.isOpen()) {
                    webSocketSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                            "type", "error",
                            "message", ex.getMessage() == null ? "SSH stream error" : ex.getMessage()
                    ))));
                }
            } catch (Exception ignored) {
            }
        } finally {
            cleanup(webSocketSession.getId());
        }
    }

    private void cleanup(String sessionId) {
        SshSessionBridge bridge = sshConnections.remove(sessionId);
        if (bridge != null) {
            bridge.close();
        }
    }

    private String sanitizeTerminalOutput(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }

        String withoutAnsi = raw
                .replaceAll(ANSI_OSC, "")
                .replaceAll(ANSI_CSI, "")
                .replaceAll(ANSI_SINGLE, "");

        String noBackspaces = applyBackspaces(withoutAnsi);
        String normalized = noBackspaces
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "")
                .replaceAll("\n{3,}", "\n\n");

        return normalized;
    }

    private String applyBackspaces(String text) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (ch == '\b') {
                if (!out.isEmpty()) {
                    out.deleteCharAt(out.length() - 1);
                }
                continue;
            }
            out.append(ch);
        }
        return out.toString();
    }
}

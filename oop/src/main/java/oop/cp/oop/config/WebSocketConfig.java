package oop.cp.oop.config;

import oop.cp.oop.ssh.SshBridgeWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SshBridgeWebSocketHandler sshBridgeWebSocketHandler;
    private final String frontendUrl;

    public WebSocketConfig(SshBridgeWebSocketHandler sshBridgeWebSocketHandler,
                           @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.sshBridgeWebSocketHandler = sshBridgeWebSocketHandler;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sshBridgeWebSocketHandler, "/ws/ssh")
                .setAllowedOrigins(frontendUrl);
    }
}

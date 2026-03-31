package oop.cp.oop.ssh;

import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicBoolean;

public class SshSessionBridge {

    private final Session session;
    private final ChannelShell channel;
    private final InputStream input;
    private final OutputStream output;
    private final AtomicBoolean closed = new AtomicBoolean(false);

    public SshSessionBridge(String host, int port, String username, String password, String ptyType) throws Exception {
        JSch jsch = new JSch();
        this.session = jsch.getSession(username, host, port);
        this.session.setPassword(password);
        Properties config = new Properties();
        config.put("StrictHostKeyChecking", "no");
        this.session.setConfig(config);
        this.session.connect(10_000);

        this.channel = (ChannelShell) session.openChannel("shell");
        this.channel.setPtyType(ptyType == null || ptyType.isBlank() ? "xterm" : ptyType);
        this.input = channel.getInputStream();
        this.output = channel.getOutputStream();
        this.channel.connect(10_000);
    }

    public int read(byte[] buffer) throws IOException {
        return input.read(buffer);
    }

    public void write(String text) throws IOException {
        output.write(text.getBytes(StandardCharsets.UTF_8));
        output.flush();
    }

    public boolean isClosed() {
        return closed.get() || session == null || !session.isConnected() || channel == null || channel.isClosed();
    }

    public void close() {
        if (closed.compareAndSet(false, true)) {
            try {
                if (channel != null && channel.isConnected()) {
                    channel.disconnect();
                }
            } catch (Exception ignored) {
            }
            try {
                if (session != null && session.isConnected()) {
                    session.disconnect();
                }
            } catch (Exception ignored) {
            }
        }
    }
}

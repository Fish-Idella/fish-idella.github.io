import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/proxy")
public class ProxyServlet extends HttpServlet {
    // 允许的安全域名列表
    private static final List<String> allowedDomains = List.of("baidu.com", "bing.com");
    
    // 自定义信任所有证书的HttpClient（生产环境应使用证书验证）
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(java.time.Duration.ofSeconds(30))
            .sslContext(insecureSslContext())
            .build();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        handleRequest(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        handleRequest(req, resp);
    }

    private void handleRequest(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // 获取URL参数
        String urlParam = getUrlParam(req);
        
        // 验证URL格式
        URI targetUri = validateUrl(urlParam);
        
        // 验证域名安全
        validateDomain(targetUri.getHost());
        
        // 请求目标URL
        HttpResponse<byte[]> response = fetchTargetUrl(targetUri);
        
        // 设置响应头
        setResponseHeaders(resp, response);
        
        // 输出内容
        writeResponseContent(resp, response);
    }

    private String getUrlParam(HttpServletRequest req) throws IOException {
        String urlParam = req.getParameter("url");
        if (urlParam == null || urlParam.isEmpty()) {
            throw new IOException("错误：缺少URL参数");
        }
        return urlParam;
    }

    private URI validateUrl(String url) throws IOException {
        try {
            URI uri = new URI(url);
            if (uri.getHost() == null || uri.getScheme() == null) {
                throw new IOException("错误：无效的URL");
            }
            return uri;
        } catch (URISyntaxException e) {
            throw new IOException("错误：URL解析失败", e);
        }
    }

    private void validateDomain(String host) throws IOException {
        boolean allowed = allowedDomains.stream()
                .anyMatch(domain -> host.endsWith(domain));
        
        if (!allowed) {
            throw new IOException("错误：不允许访问该域名");
        }
    }

    private HttpResponse<byte[]> fetchTargetUrl(URI url) throws IOException {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(url)
                    .GET()
                    .build();
            
            return httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("请求被中断", e);
        } catch (Exception e) {
            throw new IOException("请求失败: " + e.getMessage(), e);
        }
    }

    private void setResponseHeaders(HttpServletResponse servletResponse, HttpResponse<?> response) {
        // 设置状态码
        servletResponse.setStatus(response.statusCode());
        
        // 设置内容类型
        response.headers().firstValue("Content-Type")
                .ifPresent(contentType -> servletResponse.setHeader("Content-Type", contentType));
        
        // 复制其他响应头（可选）
        response.headers().map().forEach((key, values) -> {
            if (!key.equalsIgnoreCase("Content-Length")) {
                values.forEach(value -> servletResponse.addHeader(key, value));
            }
        });
    }

    private void writeResponseContent(HttpServletResponse response, HttpResponse<byte[]> httpResponse) throws IOException {
        response.getOutputStream().write(httpResponse.body());
        response.getOutputStream().flush();
    }

    // 创建不安全的SSL上下文（生产环境不推荐！）
    private static javax.net.ssl.SSLContext insecureSslContext() {
        try {
            javax.net.ssl.SSLContext sc = javax.net.ssl.SSLContext.getInstance("TLS");
            sc.init(null, new javax.net.ssl.TrustManager[]{
                new javax.net.ssl.X509TrustManager() {
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                        return null;
                    }
                    public void checkClientTrusted(
                        java.security.cert.X509Certificate[] certs, String authType) {
                    }
                    public void checkServerTrusted(
                        java.security.cert.X509Certificate[] certs, String authType) {
                    }
                }
            }, new java.security.SecureRandom());
            return sc;
        } catch (Exception e) {
            throw new RuntimeException("无法创建不安全SSL上下文", e);
        }
    }
}
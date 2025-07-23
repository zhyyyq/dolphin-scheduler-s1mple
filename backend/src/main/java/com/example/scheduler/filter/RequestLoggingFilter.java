package com.example.scheduler.filter;

import com.example.scheduler.wrapper.BufferedRequestWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingResponseWrapper;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class RequestLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        BufferedRequestWrapper requestWrapper = new BufferedRequestWrapper(req);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(res);

        logger.info("Received request: {} {} from {}", requestWrapper.getMethod(), requestWrapper.getRequestURI(), requestWrapper.getRemoteAddr());
        logger.info("Request body: {}", requestWrapper.getRequestBody());

        try {
            chain.doFilter(requestWrapper, responseWrapper);
        } catch (Exception e) {
            logger.error("Error processing request", e);
            throw e;
        } finally {
            String responseBody = new String(responseWrapper.getContentAsByteArray(), response.getCharacterEncoding());
            logger.info("Response body: {}", responseBody);
            responseWrapper.copyBodyToResponse();
        }
    }
}

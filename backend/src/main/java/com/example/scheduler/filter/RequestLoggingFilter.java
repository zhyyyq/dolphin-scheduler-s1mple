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

        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(res);

        // For multipart requests, don't wrap the request, just log and proceed.
        if (req.getContentType() != null && req.getContentType().startsWith("multipart/form-data")) {
            logger.info("Received multipart request: {} {} from {}", req.getMethod(), req.getRequestURI(), req.getRemoteAddr());
            chain.doFilter(req, responseWrapper);
        } else {
            // For other requests, wrap the request to log the body.
            BufferedRequestWrapper requestWrapper = new BufferedRequestWrapper(req);
            logger.info("Received request: {} {} from {}", requestWrapper.getMethod(), requestWrapper.getRequestURI(), requestWrapper.getRemoteAddr());
            logger.info("Request body: {}", requestWrapper.getRequestBody());
            chain.doFilter(requestWrapper, responseWrapper);
        }

        // Log response
        String responseBody = new String(responseWrapper.getContentAsByteArray(), response.getCharacterEncoding());
        logger.info("Response body: {}", responseBody);
        responseWrapper.copyBodyToResponse();
    }
}

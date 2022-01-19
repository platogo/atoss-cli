#!/usr/bin/env bash

# This is an experimental script to try to compile
# atoss-cli to a native binary using GraalVM's native-image compiler
# You need a GraalVM JDK.

# Ensure Graal native-image program is installed
gu install native-image

"native-image" \
    -jar target/uberjar/atoss-cli-standalone.jar \
    -H:Name=atoss-native \
    -H:+ReportExceptionStackTraces \
	--initialize-at-build-time=com.fasterxml.jackson,cheshire \
	--initialize-at-build-time=clojure,slingshot,potemkin,riddley,clj_http,clj_tuple,clj_tuple$hash_map,clj_tuple$vector \
    --initialize-at-build-time=org.apache.http.conn.ssl.AllowAllHostnameVerifier \
    --initialize-at-build-time=org.apache.http.conn.ssl.StrictHostnameVerifier \
    --initialize-at-build-time=org.apache.http.conn.ssl.SSLConnectionSocketFactory \
    --initialize-at-build-time=org.apache.http.nio.conn.ssl.SSLIOSessionStrategy \
    --initialize-at-build-time=org.apache.http.Consts \
    --initialize-at-build-time=org.apache.commons.logging.LogFactory \
    --initialize-at-build-time=org.apache.commons.logging.impl.LogFactoryImpl \
    --initialize-at-build-time=org.apache.commons.logging.impl.Jdk14Logger \
    --initialize-at-build-time=org.apache.http.conn.ssl.BrowserCompatHostnameVerifier \
	--initialize-at-run-time=java.security \
	--initialize-at-run-time=sun.security.ssl \
	--initialize-at-run-time=org.apache.http.conn \
	--enable-all-security-services \
	--allow-incomplete-classpath \
	-H:EnableURLProtocols=http,https \
	-H:ReflectionConfigurationFiles=reflection.json \
    --no-fallback \
    --no-server \
	--verbose \
    "-J-Xmx3g"

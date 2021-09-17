#!/usr/bin/env bash
set -euo pipefail

JAR_NAME="atoss-cli-standalone.jar"

# This is a simple bash wrapper around the JAR that passes down args to the Java launcher.

java -jar /usr/local/bin/$JAR_NAME "$@"

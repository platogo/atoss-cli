#!/usr/bin/env bash
set -euo pipefail

JAR_NAME="atoss-cli-standalone.jar"
INSTALL_DIR=/usr/local/bin

# This is a simple bash wrapper around the JAR that passes down args to the Java launcher.

java -jar $INSTALL_DIR/$JAR_NAME "$@"

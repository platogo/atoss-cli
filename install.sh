#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

PWD=$(pwd)

echo "Installing ATOSS CLI..."

LATEST_REL_URL="https://github.com/platogo/atoss-cli/releases/download/latest/atoss-cli-standalone.jar"
LOCAL_JAR_FILE=$PWD/target/uberjar/atoss-cli-standalone.jar

if [ -f "$LOCAL_JAR_FILE" ]; then
    echo "Local uberjar exists, skipping pull from remote."
	cp $PWD/target/uberjar/atoss-cli-standalone.jar /usr/local/bin/
else
    echo "$LOCAL_JAR_FILE does not exist, pulling release from Github."
	curl -L $LATEST_REL_URL > atoss-cli-standalone.jar
	mv atoss-cli-standalone.jar /usr/local/bin/
fi

echo "Installing wrapper"

cp wrapper.sh /usr/local/bin/atoss-cli

echo "Install complete, you can now use `atoss-cli`"


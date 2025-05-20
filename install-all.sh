#!/bin/bash

find . -name "package.json" -type f -not -path "*/node_modules/*" -not -path "*/\.*" | while read -r package_file; do
    dir=$(dirname "$package_file")
    echo "Installing dependencies in $dir"
    (cd "$dir" && npm install)
done


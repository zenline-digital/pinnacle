#!/bin/bash
if ! command -v pdftotext &> /dev/null; then
  apt-get update -qq && apt-get install -y -qq poppler-utils 2>/dev/null || true
fi

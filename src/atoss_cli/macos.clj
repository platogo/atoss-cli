(ns atoss-cli.macos
  (:require [clojure.java.io :as io]
            [clojure.java.shell :as sh]))

(defn is-mac? "Check if the current OS is macOS." 
  []
  (re-find #"OS X" (System/getProperty "os.name")))

(defn remove-quarantine-attr
  "Remove the quarantine attribute from a file."
  [file]
  (let [file-path (str file)]
    (if (.exists (io/file file-path))
      (sh/sh "xattr" "-d" "com.apple.quarantine" file-path)
      (println (str "File " file-path " does not exist.")))))

(defn add-spctl-label "Add a spctl label to a file."
  [file]
  (let [file-path (str file)]
    (if (.exists (io/file file-path))
      (sh/sh "spctl" "--add" file-path)
      (println (str "File " file-path " does not exist.")))))
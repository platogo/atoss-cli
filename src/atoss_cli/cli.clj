(ns atoss-cli.cli
  (:require
   [clojure.java.io :as io]
   [atoss-cli.atoss :refer [valid-day-codes]]
   [clojure.term.colors :as c])
  (:import (java.text SimpleDateFormat)
           (java.util Date Properties))
  (:gen-class))

(comment
  "This handles all CLI related parts of the ATOSS CLI, such as printing, parsing arguments etc.")

(def desc "ATOSS CLI by Platogo Interactive Entertainment Gmbh.
Work seamlessly with ATOSS time sheets.")

(def help-header
  (str
   (c/bold "USAGE") "
  atoss-cli <command> [args]

"
   (c/bold "COMMANDS")
   "
  log:                     Log time pair for today or a specific date
  web:                     Open Atoss web interface in default browser
  config init:             Initialize the configuration
  config set <key> <val>:  Set a custom configuration value
"))

(defn today-date
  "Get today's date."
  []
  (.format
   (SimpleDateFormat. "dd.MM.yyyy")
   (new Date)))

(defn read-project-version []
  (-> (doto (Properties.)
        (.load (->
                (io/file "META-INF" "maven" "atoss-cli" "atoss-cli" "pom.properties")
                (.getPath)
                (io/resource)
                (io/reader))))
      (.get "version")))

(def options
  ;; An option with a required argument
  [["-d" "--date DATE" "Date in the format DD.MM.YYYY"
    :default (today-date)] ;; FIXME: Add validation
   ["-c" "--day-code CODE" "Valid ATOSS day code (e.g. wh for WFH) can also be left blank."
    :default " "
    :validate [#(contains? valid-day-codes %) "Must be a valid ATOSS time code."]]
   ["-s" "--start-time TIME" "Work start time in the format HH:MM"
    :default "9:00"]
   ["-e" "--end-time TIME" "Work end time in the format HH:MM"
    :default "17:00"]
   ["-f" "--file FILE" "Log times based on an input file."]
   ;; A non-idempotent option (:default is applied first)
   ["-v" nil "Verbosity level"
    :id :verbosity
    :default 0
    :update-fn inc]
   [nil "--version" "Print CLI version"
    :default false]
   ;; A boolean option defaulting to nil
   ["-h" "--help" "Show this help printout."
    :default false]])

(defn print-help
  [args-summary]
  (print desc)
  (newline)
  (newline)
  (print help-header)
  (newline)
  (newline)
  (print args-summary))

(defn print-project-ver []
  (println (format "Version: %s" (read-project-version))))

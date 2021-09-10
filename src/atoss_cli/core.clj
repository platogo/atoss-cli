(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require [clojure.tools.cli :refer [parse-opts]])
  (:gen-class))

(def desc "ATOSS CLI by Platogo Interactive Entertainment Gmbh.
Authors: Daniils Petrovs")

(def today-date (.format
                 (java.text.SimpleDateFormat. "dd.MM.yyyy")
                 (new java.util.Date)))

(def valid-day-codes #{"du" "nu" "rt" "sd" "ta" "th" "tp" "ts" "wh"})

(def cli-options
  ;; An option with a required argument
  [["-d" "--date DATE" "Date in the format DD.MM.YYYY"
    :default today-date
    :validate [#(< 0 % 0x10000) "Must be a number between 0 and 65536"]]
   ["-c" "--day-code CODE" "Valid ATOSS day code (e.g. wh for WFH)"
    :default "wh"
    :validate [#(contains? valid-day-codes %) "Must be a valid ATOSS time code."]]
   ["-s" "--start-time TIME" "Work start time in the format HH:MM"
    :default "9:00"]
   ["-e" "--end-time TIME" "Work end time in the format HH:MM"
    :default "17:00"]
   ;; A non-idempotent option (:default is applied first)
   ["-v" nil "Verbosity level"
    :id :verbosity
    :default 0
    :update-fn inc]
   ;; A boolean option defaulting to nil
   ["-h" "--help"]])

(defn -main [& args]
  (println desc)
  (println "Parsed opts: \n" (parse-opts args cli-options)))

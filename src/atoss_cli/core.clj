(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require [clojure.tools.cli :refer [parse-opts]]
            [atoss-cli.atoss :as atoss])
  (:import (java.util Date) [java.text SimpleDateFormat])
  (:gen-class))

(def desc "ATOSS CLI by Platogo Interactive Entertainment Gmbh.
Authors: Daniils Petrovs")

(def today-date (.format
                 (java.text.SimpleDateFormat. "dd.MM.yyyy")
                 (new java.util.Date)))

(def cli-options
  ;; An option with a required argument
  [["-d" "--date DATE" "Date in the format DD.MM.YYYY"
    :default today-date] ;; FIXME: Add validation
   ["-c" "--day-code CODE" "Valid ATOSS day code (e.g. wh for WFH) can also be left blank."
    :default nil
    :validate [#(contains? atoss/valid-day-codes %) "Must be a valid ATOSS time code."]]
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

(defn log-time
  "Perform time logging with the given options."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)
        {date :date} opts]
    (doto driver
      (atoss/login creds)
      (atoss/nav-to-time-correction)
      (atoss/set-date date)
      (atoss/create-time-pair-entry opts)
      (atoss/logout)
      (atoss/end))
    (println "Logged time")))

(defn -main [& args]
  (println desc)
  (let [{^java.util.Collection arguments :arguments
         summary :summary,
         :as opts} (parse-opts args cli-options)]
    (if (.contains arguments "help")
      (println summary)
      (log-time opts))))

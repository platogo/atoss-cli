(ns atoss-cli.core
  (:require [clojure.string :as str]
            )
  (:gen-class))

;; (def atoss-creds {:username (env :atoss_username)
;;                   :password (env :atoss_password)})

(def desc "ATOSS CLI by Platogo Gmbh.")

(defn -main [& args]
  (println desc)
  (if (= (count args) 2)
    (do
      (doseq [arg args]
        (println arg))
      ;; create a driver and pass to atos
      )
    ))

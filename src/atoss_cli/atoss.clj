(ns atoss-cli.atoss
  (:require [etaoin.api :as api]
            [etaoin.keys :as keys]))

(def atoss-url "https://ases.novomatic.com/SES/html")
(def atoss-creds {:username "" :password ""})

(defn login
  "Perform login into ATOSS dashboard."
  [driver]
  (println "Logging into ATOSS")
  (doto driver
    (api/go atoss-url)
    (api/wait 5) ;; TODO: replace with proper waiter
    (api/fill-active driver (atoss-creds :username))
    (api/fill-active driver keys/tab)
    (api/fill-active driver (atoss-creds :password))
    (api/fill-active driver keys/enter)))

(ns atoss-cli.atoss
  (:require [etaoin.api :as api]
            [etaoin.keys :as keys])
  (:gen-class))

(def atoss-url "https://ases.novomatic.com/SES/html")
(def atoss-creds {:username "" :password ""})

(def fav-btn {:css ".is-favorite"})

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

(defn nav-to-time-correction
  "Navigate the driver to the time correction page.
  This is where all of the data entry must happen."
  [driver]
  (doto driver
    (api/switch-frame-parent)
    (api/click fav-btn)
    (api/wait-visible driver {:tag :span :fn/has-text "Tagescode"})))

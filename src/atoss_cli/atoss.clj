(ns atoss-cli.atoss
  (:require [etaoin.api :as api]
            [etaoin.keys :as keys])
  (:gen-class))

(def atoss-url "https://ases.novomatic.com/SES/html")
(def workday {:def-start-time "9:00"
              :def-end-time "17:30"})

(def nav-menu-btn {:css "#nav_menu"})
(def nav-user-btn {:css "#nav_user"})

(def fav-btn {:css ".is-favorite"})

(defn login
  "Perform login into ATOSS dashboard using provided ATOSS credentials."
  [driver {user :username pass :password}]
  (println "Logging into ATOSS with user: " user)
  (doto driver
    (api/go atoss-url)
    (api/wait 3) ;; TODO: replace with proper waiter
    (api/fill-active user)
    (api/fill-active keys/tab)
    (api/fill-active pass)
    (api/fill-active keys/enter)))

(defn nav-to-time-correction
  "Navigate the driver to the time correction page.
  This is where all of the data entry must happen."
  [driver]
  (doto driver
    (api/switch-frame :applicationIframe)
    (api/click nav-menu-btn)
    (api/click fav-btn)
    (api/wait-visible {:tag :span :fn/has-text "Tagescode"})))

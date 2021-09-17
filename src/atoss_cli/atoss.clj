(ns atoss-cli.atoss
  "Functions related to interacting with ATOSS via WebDriver."
  (:require [clojure.spec.alpha :as spec]
            [clojure.edn :as edn]
            [etaoin.api :as api]
            [etaoin.keys :as keys])
  (:gen-class))

(spec/def :day/code (spec/or
                     :code #{:du :nu :rt :sd :ta :th :tp :ts :wh}
                     :empty nil?
                     :empty-str #(= % "")))

(def atoss-url "https://ases.novomatic.com/SES/html")

(def login-btn {:css ".btn-login"})
(def nav-menu-btn {:css "#nav_menu"})
(def nav-user-btn {:css "#nav_user"})

(def zeitkorr-btn {:css "div.z-panelchildren > div.z-atossbutton:nth-of-type(4)"})
(def logout-btn {:css ".z-logoutbutton"})

(def update-btn {:css ".z-toolbarbutton:nth-of-type(1)"})
(def date-input {:css ".z-datebox-input"})

(defn setup-driver
  "Create a default driver instance to be used for interacting with ATOSS."
  []
  (let [driver (api/chrome-headless)]
    (api/set-window-size driver 1200 800)
    driver))

(defn login
  "Perform login into ATOSS dashboard using provided ATOSS credentials."
  [driver {user :username pass :password}]
  (println "Logging into ATOSS with user: " user)
  (doto driver
    (api/go atoss-url)
    (api/switch-frame :applicationIframe)
    (api/wait-enabled login-btn)
    (api/wait 2)
    (api/fill-active user)
    (api/fill-active keys/tab)
    (api/fill-active pass)
    (api/fill-active keys/enter))
  (println "Logged in"))

(defn logout
  [driver]
  (println "Logging out of ATOSS")
  (doto driver
    (api/click nav-user-btn)
    (api/click logout-btn)))

(defn end
  [driver]
  (api/quit driver))

(defn nav-to-time-correction
  "Navigate the driver to the time correction page.
  This is where all of the data entry must happen."
  [driver]
  (doto driver
    (api/wait-visible nav-menu-btn)
    (api/click nav-menu-btn)
    (api/wait-visible zeitkorr-btn)
    (api/click zeitkorr-btn)
    (api/wait-visible {:tag :span :fn/has-text "Tagescode"})))

(defn set-date
  "Sets the day of the month in time correction that the time pair will be applied to."
  [driver date]
  (doto driver
    (api/wait-visible date-input)
    (api/click date-input)
    (api/wait 1)
    (api/fill-active date)
    (api/wait 2)
    (api/click update-btn)
    (api/wait 1)))

(defn create-time-pair-entry
  "Create a new time entry as a combination of day code and a time pair for a given day."
  [driver {day-code :day-code start :start-time end :end-time}]
  (if (spec/valid? :day/code (keyword day-code))
    (do
      (println (if (nil? day-code)
                 "No day code provided"
                 (str "Day code: " day-code)))
      (doto driver
        (api/click date-input)
        (api/fill-active keys/tab)
        (api/fill-active keys/tab)
        (api/fill-active keys/tab)
        (api/fill-active keys/tab))
      (api/wait driver 3) ;; Do not touch waiters - if it is any less, the UI will not have enough time to update
      (doto driver
        (api/fill-active (if (nil? day-code) "" (name day-code)))
        (api/fill-active keys/tab)
        (api/wait 2)
        (api/fill-active start)
        (api/fill-active keys/tab)
        (api/wait 2)
        (api/fill-active end)
        (api/fill-active keys/enter)
        (api/wait 2)))
    (spec/explain :day/code day-code)))

(defn creds-from-dotfile
  "Returns atoss credentials from dotfile in home directory."
  []
  (let [dotfile-name ".atoss"
        dotfile-path (str (System/getProperty "user.home") "/" dotfile-name)]
    (-> dotfile-path (slurp) (edn/read-string))))

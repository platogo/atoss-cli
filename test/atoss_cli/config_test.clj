(ns atoss-cli.config-test
  (:require
   [clojure.test :refer [deftest is]]
   [clojure.java.io :as io]
   [atoss-cli.config :as subject]
   [clojure.edn :as edn]))

(defn setup []
  (spit "test.edn" (with-out-str (pr {:username 123456}))))

(defn teardown []
  (io/delete-file "test.edn"))

(deftest load-in-test
  (setup)
  (is (= {:url "https://ases.novomatic.com/SES/html", :username 123456}
         (subject/load-in "test.edn")))
  (teardown))

(deftest set-val-test
  (setup)
  (subject/set-val "test.edn" :url "http://test.com")
  (is (= "http://test.com"
         (-> "test.edn" (slurp) (edn/read-string) (:url))))
  (teardown))

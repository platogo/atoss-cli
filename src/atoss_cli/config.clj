(ns atoss-cli.config
  "Configuration management"
  (:require
   [clojure.edn :as edn]
   [clojure.java.io :as io]))

(def default-config-file-name ".atoss")
(def default-url "https://ases.novomatic.com/SES/html")

(defn default-config-file-path [file-name]
  (-> (io/file (System/getProperty "user.home") file-name) (.getPath)))

(defn load-in
  "Load the config from the given file and merges it with defaults, returning a map."
  ([]
   (load-in (default-config-file-path default-config-file-name)))
  ([file]
   (try
     (let [parsed-config (-> file (slurp) (edn/read-string))]
       (merge {:url default-url} parsed-config))

     (catch Exception _e (printf "Failed to load config, make sure %s file exists!\n" file)))))

(defn write
  "Writes the given `config` to `file`."
  [file config]
  (spit file (with-out-str (pr config))))

(defn init
  "Initialise config by creating an empty config file."
  ([] (write (default-config-file-path default-config-file-name) {}))
  ([file] (write file {})))

(defn set-val
  "Set a `val` for the given configuration `key` and persist it."
  ([key val]
   (set-val (default-config-file-path default-config-file-name) key val))

  ([file key val]
   (let [current-config (load-in file)
         new-config (assoc current-config key val)]
     (write file new-config))))


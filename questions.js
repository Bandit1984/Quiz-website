export const quizData = {
  title: "Quiz 1 (Module 1 with overlap into Module 2)",
  questions: [
    {
      id: 1,
      question: "What does veracity in Big Data refer to?",
      options: [
        "The speed at which data is generated",
        "The quality or fidelity of data",
        "The volume of data",
        "The variety of data",
        "The value of data"
      ],
      correctAnswer: 1
    },
    {
      id: 2,
      question: "Which of the following is a challenge related to Big Data?",
      options: [
        "Limited data storage capacity",
        "Storing, managing, and analyzing Big Data",
        "Lack of cloud computing platforms",
        "Insufficient data generation",
        "Lack of variety in data"
      ],
      correctAnswer: 1
    },
    {
      id: 3,
      question: "Which of the following is a characteristic of Big Computation?",
      options: [
        "High volume of data",
        "High computational power",
        "Large variety of data",
        "Data visualization",
        "Machine learning"
      ],
      correctAnswer: 1
    },
    {
      id: 4,
      question: "Which component of Big Data is responsible for storing massive datasets across multiple nodes?",
      options: [
        "Data Ingestion",
        "Data Processing",
        "Data Storage",
        "Data Governance",
        "Data Analysis"
      ],
      correctAnswer: 2
    },
    {
      id: 5,
      question: "Which tool is used in Big Data for parallelizing processing tasks for lightning-fast results?",
      options: [
        "Apache Kafka",
        "Apache Flume",
        "Apache Spark",
        "Tableau",
        "Cassandra"
      ],
      correctAnswer: 2
    },
    {
      id: 6,
      question: "What is a primary goal of Data Governance in Big Data systems?",
      options: [
        "Enhance processing speed",
        "Ensure ethical and trustworthy data handling",
        "Improve storage capacity",
        "Optimize data analysis",
        "Increase data variety"
      ],
      correctAnswer: 1
    },
    {
      id: 7,
      question: "Which of the following is a component of Hadoop used for data storage?",
      options: [
        "HBase",
        "Cassandra",
        "HDFS",
        "YARN",
        "MapReduce"
      ],
      correctAnswer: 2
    },
    {
      id: 8,
      question: "What type of data does Hadoop typically process?",
      options: [
        "Only structured data",
        "Only semi-structured data",
        "Only unstructured data",
        "Structured, semi-structured, and unstructured data",
        "Only real-time data"
      ],
      correctAnswer: 3
    },
    {
      id: 9,
      question: "In the context of Big Data, what is a big graph primarily motivated by?",
      options: [
        "Social networks",
        "Data storage",
        "Machine learning",
        "Data governance",
        "Complex algorithms"
      ],
      correctAnswer: 0
    },
    {
      id: 10,
      question: "Which of the following describes a challenge in Big Data computation?",
      options: [
        "Managing data privacy",
        "Building and maintaining robust computing infrastructure",
        "Inconsistent data processing",
        "Lack of data visualization tools",
        "Insufficient data ingestion"
      ],
      correctAnswer: 1
    },
    {
      id: 11,
      question: "What is the purpose of Hadoop's MapReduce tool?",
      options: [
        "Data storage management",
        "Resource management",
        "Data ingestion",
        "Distributed data processing",
        "Data analysis"
      ],
      correctAnswer: 3
    },
    {
      id: 12,
      question: "What is the key feature of Hadoop Distributed File System (HDFS)?",
      options: [
        "Unlimited scalability",
        "3-way replication",
        "No fault tolerance",
        "Read-write capability",
        "Centralized data storage"
      ],
      correctAnswer: 1
    },
    {
      id: 13,
      question: "Which tool in the Hadoop ecosystem is primarily used for machine learning tasks?",
      options: [
        "Mahout",
        "Ambari",
        "Zookeeper",
        "Kafka",
        "Pig"
      ],
      correctAnswer: 0
    },
    {
      id: 14,
      question: "Which Hadoop tool is used for processing structured data?",
      options: [
        "Pig",
        "SparkSQL",
        "Kafka",
        "Sqoop",
        "Oozie"
      ],
      correctAnswer: 1
    },
    {
      id: 15,
      question: "Which of the following is NOT a feature of Apache Spark?",
      options: [
        "In-memory computing",
        "Fault tolerance",
        "Built-in machine learning libraries",
        "Only works with HDFS",
        "None of above"
      ],
      correctAnswer: 3
    },
    {
      id: 16,
      question: "Which component of the Hadoop ecosystem provides a NoSQL database?",
      options: [
        "Apache HBase",
        "Apache Flume",
        "Apache Kafka",
        "Apache Spark",
        "All of above"
      ],
      correctAnswer: 0
    },
    {
      id: 17,
      question: "What is the main function of YARN in the Hadoop ecosystem?",
      options: [
        "Data storage",
        "Resource management and job scheduling",
        "Data processing",
        "Query optimization",
        "Fault tolerance"
      ],
      correctAnswer: 1
    },
    {
      id: 18,
      question: "What does the Map phase do in a MapReduce job?",
      options: [
        "Reduce data into a smaller set",
        "Process input data and produce intermediate key-value pairs",
        "Sort and shuffle data",
        "Write output to HDFS",
        "Partition the data"
      ],
      correctAnswer: 1
    },
    {
      id: 19,
      question: "Which of the following is a distributed stream-processing framework in the Hadoop ecosystem?",
      options: [
        "Apache Hive",
        "Apache HBase",
        "Apache Kafka",
        "Apache Flink",
        "Apache Pig"
      ],
      correctAnswer: 4
    },
    {
      id: 20,
      question: "Which of the following frameworks is specifically designed for real-time stream processing?",
      options: [
        "Apache Hive",
        "Apache MapReduce",
        "Apache Kafka",
        "Apache Pig",
        "Apache HBase"
      ],
      correctAnswer: 2
    },
    {
      id: 21,
      question: "What is the primary function of the Shuffle and Sort phase in MapReduce?",
      options: [
        "Divide the data into smaller chunks",
        "Sort the input data before the Map phase",
        "Organize and group intermediate key-value pairs produced by the Map phase",
        "Merge the results of the Reduce phase",
        "Store the data in HDFS"
      ],
      correctAnswer: 2
    },
    {
      id: 22,
      question: "What does the Reduce phase do in a MapReduce job?",
      options: [
        "Sort the intermediate data from the Map phase",
        "Shuffle and organize the key-value pairs",
        "Aggregate, summarize, and compute the final result based on the intermediate data",
        "Partition the input data",
        "Store intermediate results in HDFS"
      ],
      correctAnswer: 2
    },
    {
      id: 23,
      question: "Which of the following is the correct order of phases in a MapReduce job?",
      options: [
        "Shuffle, Map, Reduce",
        "Map, Shuffle and Sort, Reduce",
        "Map, Reduce, Shuffle",
        "Reduce, Map, Shuffle",
        "Shuffle, Reduce, Map"
      ],
      correctAnswer: 1
    },
    {
      id: 24,
      question: "What is the main advantage of using a global hashing index in a distributed system like HDFS?",
      options: [
        "Faster data access within a single node",
        "Centralized management of data across the entire cluster",
        "Easier local data processing without network communication",
        "Reduces the need for MapReduce jobs",
        "Simplifies fault tolerance and replication"
      ],
      correctAnswer: 1
    },
    {
      id: 25,
      question: "Which of the following is a key characteristic of a local hashing index in HDFS?",
      options: [
        "Provides a global view of data across the entire cluster",
        "Used to manage metadata centrally in the system",
        "Helps with cross-node querying and joins",
        "Used for fast data access and retrieval within a single node",
        "Stores the entire dataset across all nodes"
      ],
      correctAnswer: 3
    },
    {
      id: 26,
      question: "What is the primary role of the master node in a Hadoop cluster?",
      options: [
        "Store data across distributed systems",
        "Manage the overall cluster and job execution",
        "Process data and run tasks",
        "Store job metadata",
        "Handle resource allocation for each task"
      ],
      correctAnswer: 1
    },
    {
      id: 27,
      question: "What is the primary responsibility of a worker node in a Hadoop cluster?",
      options: [
        "Manage resource allocation",
        "Store the HDFS metadata",
        "Handle job scheduling",
        "Process data and execute tasks",
        "Monitor the health of the cluster"
      ],
      correctAnswer: 3
    },
    {
      id: 28,
      question: "What is the default replication factor in HDFS?",
      options: [
        "1",
        "2",
        "3",
        "4",
        "5"
      ],
      correctAnswer: 2
    },
    {
      id: 29,
      question: "In HDFS, what is the size of a block in default configurations?",
      options: [
        "64 MB",
        "128 MB",
        "128 GB",
        "256 MB",
        "1 GB"
      ],
      correctAnswer: 1
    },
    {
      id: 30,
      question: "How does HDFS ensure fault tolerance in case of node failure?",
      options: [
        "By storing all data on a single node",
        "By compressing data before storing it",
        "By replicating data blocks across multiple nodes",
        "By using RAID storage for data protection",
        "By encrypting data to prevent corruption"
      ],
      correctAnswer: 2
    }
  ]
};

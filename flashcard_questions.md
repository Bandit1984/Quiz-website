# Big Data Analytics — Flashcards

## Part I: MapReduce vs. Apache Spark Architecture

### Question 1

What is the fundamental disk I/O bottleneck in traditional Hadoop MapReduce that Apache Spark was designed to eliminate?

**Answer:** In Hadoop MapReduce, intermediate state between Map and Reduce phases must be serialized and written to local disk, and the output of every job is committed to HDFS with multi-node replication. For iterative algorithms and multi-stage workflows, this creates heavy disk I/O and serialization penalties. Apache Spark eliminates this bottleneck by retaining intermediate datasets in distributed executor memory (RAM) across transformations and actions, spilling to disk only when memory limits are exceeded.

---

### Question 2

Compare how intermediate data between processing stages is stored in Hadoop MapReduce versus Apache Spark.

**Answer:** Hadoop MapReduce materializes intermediate map outputs to local disk and final reduce outputs to HDFS with replication. In contrast, Apache Spark stores intermediate partitions in distributed executor RAM across the cluster, sharing data directly in memory across consecutive processing stages without touching disk unless memory becomes full.

---

### Question 3

Why is Apache Spark significantly faster than Hadoop MapReduce for iterative machine learning algorithms?

**Answer:** Iterative machine learning algorithms (such as K-Means or Gradient Descent) repeatedly apply transformations over the same dataset across dozens or hundreds of iterations. While MapReduce must write to disk and reread from storage on every single iteration, Spark caches the working dataset in executor memory, allowing subsequent iterations to execute in RAM with minimal latency.

---

### Question 4

Explain the difference in execution model between MapReduce’s strict two-phase (Map → Reduce) pipeline and Spark’s DAG-based pipeline.

**Answer:** Hadoop MapReduce enforces a rigid two-stage Map → Shuffle/Sort → Reduce pipeline, requiring multi-step workflows to be split into separate, distinct jobs chained together through disk. Apache Spark uses a flexible Directed Acyclic Graph (DAG) of arbitrary transformations, allowing the DAGScheduler to optimize the entire pipeline, prune redundant steps, and pipeline consecutive narrow transformations into a single physical execution stage.

---

### Question 5

In Hadoop MapReduce, what component manages job scheduling and resource allocation, and what is its equivalent in a Spark cluster?

**Answer:** In Hadoop MapReduce, YARN (consisting of the ResourceManager and NodeManagers) manages cluster resources and job scheduling. In Apache Spark, a Cluster Manager (such as Spark Standalone, YARN, or Kubernetes) allocates hardware resources to long-lived Executors, while the Spark Driver (via its DAGScheduler and TaskScheduler) coordinates stage execution and schedules individual tasks.

---

### Question 6

How does real-time/stream processing differ structurally between Hadoop MapReduce ecosystems and Apache Spark?

**Answer:** Hadoop MapReduce is fundamentally designed for batch processing with high job startup latency and lacks a native streaming engine, requiring external tools like Apache Storm or Flume. Apache Spark natively integrates low-latency streaming through micro-batching (Spark Streaming) and continuous stream processing (Structured Streaming), allowing stream and batch pipelines to share identical unified APIs, data structures, and cluster resources.

---

### Question 7

Explain why Spark can achieve up to 100x speedups over MapReduce in memory, but may only achieve ~10x speedups when processing purely on disk.

**Answer:** Spark achieves up to 100x speedups in memory by eliminating physical disk I/O, network replication writes, and repeated deserialization. When forced to process purely on disk, Spark still achieves roughly 10x speedups over MapReduce due to its multi-threaded executor architecture, lower task startup latency, operation pipelining, and sophisticated shuffle and sorted-aggregation algorithms.

---

### Question 8

What role does HDFS play in a Hadoop MapReduce workflow, and is HDFS strictly required to run an Apache Spark job?

**Answer:** In Hadoop MapReduce, HDFS is the primary storage layer that provides scalable block storage, fault tolerance through replication, and data locality for task scheduling. HDFS is not strictly required for Apache Spark; Spark is storage-agnostic and can run against Amazon S3, Google Cloud Storage, Azure Blob Storage, Apache Cassandra, local filesystems, or relational databases.

---

### Question 9

Compare the API expressiveness of Hadoop MapReduce (Java-based Mapper/Reducer classes) with PySpark RDD abstractions.

**Answer:** Hadoop MapReduce requires low-level, verbose Java boilerplate, requiring developers to write explicit Mapper, Reducer, and Driver configuration classes with custom Writable serialization types. PySpark offers concise, high-level functional programming abstractions (RDDs, DataFrames, and SQL) where data transformations can be expressed in fluid one-line operations such as map, filter, and reduceByKey.

---

### Question 10

Describe a scenario or workload where traditional Hadoop MapReduce might still be chosen over Apache Spark.

**Answer:** Hadoop MapReduce is still chosen for massive, infrequent batch ETL jobs processing petabytes of data on hardware clusters with limited memory where execution time is not critical. It is also preferred in mature, battle-tested legacy enterprise pipelines already operational on HDFS/YARN where the migration cost to Spark cannot be justified.

---

## Part II: Core RDD Properties & Lineage

### Question 11

Define an RDD and identify the three core concepts represented by its acronym.

**Answer:** An RDD (Resilient Distributed Dataset) is Spark's fundamental data abstraction representing an immutable collection of elements partitioned across cluster nodes. Resilient means it can recover lost partitions automatically via lineage; Distributed means partitions are processed concurrently across multiple machines; and Dataset means it represents the underlying records or objects being transformed.

---

### Question 12

Explain why RDDs are designed to be read-only (immutable) rather than mutable in-place data structures.

**Answer:** Immutability guarantees deterministic execution and thread safety across distributed worker processes without requiring locks or synchronization mechanisms. Crucially, it simplifies fault tolerance: because an RDD cannot be altered after creation, any lost partition can be safely and reliably recomputed from upstream parents using its original transformation recipe.

---

### Question 13

What is a Spark Lineage Graph (DAG), and how does Spark construct it during program execution?

**Answer:** A Spark Lineage Graph is a Directed Acyclic Graph tracking the sequence of dependencies and transformations used to construct child RDDs from base datasets. Spark builds this graph incrementally and lazily in the Driver process whenever transformations (such as map, filter, or flatMap) are invoked, postponing physical execution until an action is triggered.

---

### Question 14

How does RDD lineage enable fault tolerance without requiring data replication across intermediate stages?

**Answer:** Instead of replicating intermediate datasets across cluster disks or network nodes, Spark records the exact deterministic transformation path that generated each partition. If a worker node crashes and loses an intermediate partition, Spark re-executes only the necessary sequence of transformations on the specific parent partition to reconstruct the lost data.

---

### Question 15

If a worker node holding Partition 3 of an RDD crashes during execution, describe the step-by-step process Spark uses to recover that data.

**Answer:** First, the Driver detects the worker failure through missing executor heartbeats. Next, the DAGScheduler consults the lineage graph to determine the parent partitions and transformations needed to reproduce Partition 3. Finally, the TaskScheduler assigns a replacement task to an available, healthy worker node, which reads the parent partition and recomputes only Partition 3.

---

### Question 16

What is the operational trade-off between recomputing lost partitions via lineage versus checkpointing intermediate RDDs to disk?

**Answer:** Lineage recomputation costs zero disk and network overhead during normal execution but can become unacceptably slow or lead to stack overflow errors if long or wide transformation chains must be recomputed upon failure. Checkpointing writes intermediate RDD partitions to durable storage (like HDFS) and truncates the lineage DAG, incurring upfront I/O overhead during execution in exchange for fast, bounded recovery times.

---

### Question 17

Explain the difference between Narrow Dependencies and Wide Dependencies in an RDD lineage graph.

**Answer:** In a Narrow Dependency, each parent partition is used by at most one child partition, meaning transformations (such as map() and filter()) can execute locally without data exchange. In a Wide Dependency, multiple child partitions depend on data from a single parent partition, requiring a network shuffle to redistribute records across cluster nodes (such as in groupByKey() and reduceByKey()).

---

### Question 18

Why do Narrow Dependencies allow pipelined execution within a single worker node, whereas Wide Dependencies require stage boundaries?

**Answer:** Narrow dependencies allow Spark to stream records through multiple successive operations in a single thread memory buffer without intermediate materialization. Wide dependencies require stage boundaries because all parent partitions must completely finish and write their shuffle output before child tasks can fetch and aggregate the redistributed keys across the network.

---

### Question 19

How does immutability simplify thread safety and lock management inside a distributed JVM/Python worker process?

**Answer:** Because RDD partitions cannot be mutated in place, multiple worker threads can concurrently read the same partition data without data corruption, race conditions, or the need for expensive locking mechanisms. This eliminates lock contention and synchronization bottlenecks across multi-threaded executor environments.

---

### Question 20

What function or command allows a developer to inspect the underlying lineage graph of a PySpark RDD?

**Answer:** A developer can inspect the lineage graph by calling `rdd.toDebugString()`. In Python, printing this method call (`print(rdd.toDebugString().decode('utf-8'))`) returns an indented, human-readable ASCII tree displaying parent RDDs, transformations, stage boundaries, and partition counts.

---

## Part III: Partitioning, Memory & Cluster Architecture

### Question 21

What is an RDD partition, and what determines the default number of partitions when reading an external text file from HDFS or S3?

**Answer:** An RDD partition is a logical division of distributed data that serves as the atomic unit of parallelism processed by a single task on a single CPU core. When reading files from HDFS or S3, the default partition count is determined by the number of underlying input file splits or filesystem blocks (typically one partition per 128 MB or 256 MB block, subject to minimum partition parameters).

---

### Question 22

Explain the architectural relationship among the Spark Driver, Cluster Manager, Executors, and Tasks.

**Answer:** The Driver runs the user application code, creates the SparkContext, builds the execution DAG, and schedules work. The Cluster Manager (YARN, K8s, or Standalone) allocates cluster resources across worker nodes. Executors are persistent processes running on worker nodes that execute tasks and hold cached data. Tasks are individual units of execution dispatched by the Driver to run on a single partition inside an Executor thread.

---

### Question 23

What performance issue occurs when an RDD has significantly more partitions than available CPU cores across the cluster?

**Answer:** Having excessive partitions creates high scheduling overhead for the Driver, serializes too many task metadata objects, and causes excessive I/O and shuffle file fragmentation with tiny data blocks. The cluster spends more time orchestrating and scheduling task execution than computing actual data.

---

### Question 24

What performance issue occurs when an RDD has far fewer partitions than available CPU cores across the cluster?

**Answer:** Having too few partitions results in severe resource underutilization, as available CPU cores remain idle while waiting for the small number of active tasks to finish. Furthermore, each partition becomes disproportionately large, increasing memory pressure on individual executor threads and risking out-of-memory errors or heavy disk spilling.

---

### Question 25

Explain the concept of Data Skew in a partitioned RDD and how it impacts overall job execution time.

**Answer:** Data Skew occurs when data is distributed unevenly across partitions, typically caused by a high concentration of records associated with a few popular keys. Because a stage cannot finish until its slowest task completes, a single massive, skewed partition creates a straggler task that bottlenecks the entire cluster and severely inflates overall job completion time.

---

### Question 26

What is the difference between .repartition(n) and .coalesce(n) in PySpark, and when should you use each?

**Answer:** `.repartition(n)` performs a full cluster shuffle to evenly redistribute data into `n` partitions and can either increase or decrease partition counts. `.coalesce(n)` avoids a full shuffle by merging adjacent partitions on local nodes, making it much faster for decreasing partition count; use coalesce to downsize partitions and repartition when increasing partitions or balancing skewed data.

---

### Question 27

Why does calling .coalesce() to reduce partition count avoid a full cluster shuffle while .repartition() triggers a shuffle?

**Answer:** `.coalesce()` collapses existing local partitions on the same worker or neighbouring nodes into larger combined partitions without redistributing individual records across keys over the network. In contrast, `.repartition()` hashes every record to reallocate data uniformly across new partitions, requiring a complete network shuffle stage.

---

### Question 28

What is the purpose of rdd.glom() in PySpark, and how can it be used to diagnose uneven partition sizes?

**Answer:** `rdd.glom()` transforms each partition into a single Python list containing all elements of that partition. By executing `rdd.glom().map(len).collect()`, developers can inspect a list of record counts across all partitions, immediately identifying empty partitions, oversized partitions, and severe data skew.

---

### Question 29

Explain how local executor memory (JVM Heap) is allocated between Spark storage (caching) and execution (shuffles/joins).

**Answer:** Spark allocates executor JVM heap under Unified Memory Management, sharing space between Storage (cached RDDs, DataFrames, broadcast variables) and Execution (shuffle buffers, joins, aggregations). When execution memory demands increase, Spark can evict cached storage partitions to disk, but active execution memory is protected and cannot be evicted by storage.

---

### Question 30

What happens when a single partition exceeds the available RAM allocated to an executor thread?

**Answer:** If an operation's buffer exceeds available RAM, Spark attempts to spill excess partition data to the executor node's local disk (if configured, such as with `MEMORY_AND_DISK`). If memory is completely exhausted and cannot buffer the operation or spilling fails, the JVM throws a fatal `java.lang.OutOfMemoryError` and crashes the task.

---

## Part IV: PySpark Execution Engine & Interoperability

### Question 31

How does the PySpark Driver communicate with the underlying JVM-based SparkContext?

**Answer:** The PySpark Driver communicates with the underlying JVM SparkContext through a local network socket using Py4J. Py4J enables the Python runtime to dynamically invoke Java methods and pass instructions to JVM objects running in the Spark engine.

---

### Question 32

What is the role of Py4J in PySpark application execution?

**Answer:** Py4J acts as an inter-process bridge library connecting Python and the JVM. It serializes method calls, commands, and configuration parameters from Python code into Java socket requests, enabling Python to instantiate and control JVM objects like SparkContext, SparkSession, and RDD.

---

### Question 33

Explain what happens under the hood when a Python lambda function is passed inside a PySpark map() transformation.

**Answer:** The Python Driver serializes (pickles) the lambda function and sends it to worker nodes. On each worker node, the JVM Executor spawns a Python daemon process, streams partition records from the JVM over standard input or local sockets to Python, executes the lambda function in Python, and streams the transformed output records back to the JVM.

---

### Question 34

Why does passing custom Python functions inside RDD transformations incur serialization (pickling) overhead?

**Answer:** Data records stored in the JVM must be converted into byte streams, transmitted over inter-process communication (IPC) sockets, deserialized into Python objects (unpickled), transformed, serialized (pickled) back into byte streams, and passed back into the JVM. This continuous pickling and context switching incurs heavy CPU and memory bandwidth overhead.

---

### Question 35

How do PySpark worker processes run Python code on cluster worker nodes alongside the JVM Executor?

**Answer:** On each worker node, the JVM Executor manages long-lived Python worker daemon processes (`pyspark.daemon`). When tasks execute, the JVM executor feeds partition records to the Python worker via Unix pipes or local loopback sockets, allowing Python code to run in its own CPython process while the JVM coordinates cluster lifecycle and I/O.

---

### Question 36

Why are PySpark DataFrame operations generally faster than raw PySpark RDD operations when executing Python code?

**Answer:** DataFrames utilize Spark's Catalyst Optimizer and Tungsten execution engine, executing operations directly inside optimized off-heap JVM bytecode. Because relational transformations are resolved into Java plans, records do not need to be serialized across IPC sockets into Python worker processes, completely bypassing Python serialization overhead.

---

### Question 37

Explain the serialization error PicklingError: Could not serialize object and what typically causes it in PySpark.

**Answer:** A `PicklingError` occurs when a transformation closure references an object from the driver scope that Python's `pickle` library cannot serialize. Common culprits include open file handles, database connections, threading locks, network sockets, or inadvertent references to the `SparkContext` inside worker lambdas.

---

### Question 38

What is a Broadcast Variable in PySpark, and how does it optimize lookups against large static datasets?

**Answer:** A Broadcast Variable distributes a large, read-only dataset to each cluster worker node once using an efficient peer-to-peer protocol, rather than sending a redundant copy with every task. Executors cache the variable locally in memory, allowing all worker tasks on that node to share it with minimal network and memory overhead.

---

### Question 39

What is an Accumulator in PySpark, and why should you avoid reading its value inside an RDD transformation?

**Answer:** An Accumulator is a write-only distributed variable that workers can add to (e.g., counters or metrics), with only the Driver permitted to read the final aggregated value. Reading an accumulator inside a transformation is invalid because transformations are evaluated lazily and may be re-executed upon task failure, resulting in non-deterministic and inflated values.

---

### Question 40

Why can side-effects (such as appending to a local Python list) inside an RDD map() function lead to incorrect behavior in distributed execution?

**Answer:** Side-effects execute inside the isolated process memory of an individual Python worker on a remote cluster machine. These modifications are never synchronized back to the Driver or across other workers, and because transformations may be re-run during task retry or speculative execution, side-effects produce inconsistent, lost, or duplicated state.

---

## Part V: RDD Transformations & Lazy Evaluation

### Question 41

Define Lazy Evaluation in Apache Spark and explain its primary operational benefits.

**Answer:** Lazy evaluation means Spark records transformations as an execution plan (lineage DAG) rather than executing them immediately when invoked, postponing computation until an Action is called. This allows Spark to optimize the global execution DAG, eliminate redundant computations, and combine multiple operations into streamlined execution stages.

---

### Question 42

How does Lazy Evaluation allow the Spark DAG Scheduler to perform execution plan optimizations?

**Answer:** Because the DAGScheduler has visibility into the entire transformation pipeline before execution begins, it can reorder operations (e.g., pushing `filter` ahead of other transformations), pipeline consecutive narrow transformations into a single pass over the data, and avoid executing transformations on unused columns or records.

---

### Question 43

Differentiate between a Transformation and an Action in PySpark. Give three examples of each.

**Answer:** A Transformation lazily creates a new RDD from an existing one without triggering execution (examples: `map()`, `filter()`, `flatMap()`). An Action triggers execution of the DAG, returning a value to the Driver program or writing data to persistent storage (examples: `count()`, `collect()`, `saveAsTextFile()`).

---

### Question 44

Trace the execution: If a script defines 15 map() and filter() transformations in sequence, how many network jobs are submitted to the cluster prior to calling an action?

**Answer:** Exactly zero (0) jobs are submitted. Because `map()` and `filter()` are lazy transformations, Spark merely constructs the lineage metadata in the Driver's memory; no cluster resources or physical network tasks are launched until an action is executed.

---

### Question 45

What is operation pipelining, and how does Spark execute multiple consecutive element-wise transformations on a single record?

**Answer:** Operation pipelining is an optimization where Spark streams each record through consecutive narrow transformations (e.g., `filter` followed by `map`) in CPU registers and L1/L2 cache during a single pass. This avoids writing intermediate records to RAM or disk between operations.

---

### Question 46

Predict the logical output of rdd = sc.parallelize([1,2,3,4,5,6]); rdd2 = rdd.filter(lambda x: x % 2 == 0).map(lambda x: x * 10). Has rdd2 executed physically at this line? Explain.

**Answer:** The logical output when computed would be `[20, 40, 60]`. However, `rdd2` has not executed physically at this line because `filter()` and `map()` are both lazy transformations; physical execution is deferred until an action such as `.collect()` is called.

---

### Question 47

What is the result of applying .union() on two RDDs, and does it trigger a network shuffle?

**Answer:** Applying `.union()` combines two RDDs into a single RDD containing all elements from both without removing duplicates. Because `.union()` is a narrow transformation where child partitions directly reference their respective parent partitions, it does not trigger a network shuffle.

---

### Question 48

What does .distinct() do to an RDD, and is it a Narrow or Wide transformation? Explain why.

**Answer:** `.distinct()` removes duplicate elements across the entire RDD. It is a Wide Transformation because duplicate records may reside in different partitions across different machines, requiring a network shuffle to redistribute records with identical values to the same partition before deduplication.

---

### Question 49

Explain the difference between .mapValues(func) and .map(func) when operating on a Pair RDD (Key, Value).

**Answer:** On a Pair RDD `(key, value)`, `.mapValues(func)` applies the transformation function strictly to the value while preserving the key unchanged. In contrast, `.map(func)` operates on the entire tuple and allows modifications to both the key and the value.

---

### Question 50

Why is .mapValues() preferred over .map() when modifying Pair RDD values if you want to preserve existing partitioning?

**Answer:** `.mapValues()` guarantees that keys remain untouched, allowing Spark to retain the existing Partitioner metadata (hash or range partitioning). Because `.map()` could alter keys, Spark discards the partitioner metadata, forcing subsequent key-based transformations to perform a redundant and expensive network shuffle.

---

## Part VI: map() vs. flatMap() Deep Dive

### Question 51

What is the fundamental difference in output cardinality between map() and flatMap()?

**Answer:** `map()` enforces a strict 1-to-1 output cardinality, meaning every single input element produces exactly one output element. `flatMap()` supports a 1-to-0..N output cardinality, meaning each input element maps to an iterable whose elements are flattened, producing zero, one, or multiple output elements.

---

### Question 52

Given rdd = sc.parallelize(["hello world", "foo bar"]), write the exact PySpark code using map() and predict its output structure.

**Answer:** Code: `rdd.map(lambda s: s.split()).collect()`. Output: `[['hello', 'world'], ['foo', 'bar']]`. It produces an RDD where each element is an unflattened Python list of tokens, preserving the original 2-element collection size.

---

### Question 53

Given rdd = sc.parallelize(["hello world", "foo bar"]), write the exact PySpark code using flatMap() and predict its output structure.

**Answer:** Code: `rdd.flatMap(lambda s: s.split()).collect()`. Output: `['hello', 'world', 'foo', 'bar']`. It produces a single flattened RDD of 4 string elements by unpacking the lists returned by the split function.

---

### Question 54

Suppose an input RDD contains N elements. What is the exact length of the output RDD produced by a map() function?

**Answer:** The output RDD produced by `map()` will contain exactly N elements, as `map()` maintains an invariant 1-to-1 mapping for each input record.

---

### Question 55

Suppose an input RDD contains N elements. What is the possible range of length for the output RDD produced by a flatMap() function?

**Answer:** The output RDD length ranges from 0 to arbitrarily large (i.e., [0, ∞)). If the function returns empty iterables for all elements the length is 0; if it yields multiple items per element the total count expands proportionally.

---

### Question 56

Write a flatMap() transformation that filters out empty lines while splitting non-empty lines into words.

**Answer:** Code: `rdd.flatMap(lambda line: line.split() if line.strip() else [])`. Empty or whitespace-only lines return an empty list `[]` (yielding 0 elements), while non-empty lines return a list of words that are flattened into records.

---

### Question 57

In a JSON processing pipeline where each input record contains an array of transaction items {"user": "A", "items": ["i1", "i2"]}, which operation (map or flatMap) should be used to flatten individual items into separate records?

**Answer:** Use `flatMap()`. Because each user record contains a list of multiple items that must be unpacked into separate records, `flatMap(lambda record: [(record['user'], item) for item in record['items']])` will unnest the items array into individual records.

---

### Question 58

What happens if a function passed to flatMap() returns None or an empty list [] for a given input element?

**Answer:** If the function returns an empty list `[]` (or empty iterable), `flatMap()` produces zero output elements for that input record, effectively filtering it out. If it returns `None`, Python throws a `TypeError: 'NoneType' object is not iterable` during task execution.

---

### Question 59

Predict the output of sc.parallelize([1, 2, 3]).flatMap(lambda x: range(1, x + 1)).collect().

**Answer:** Output: `[1, 1, 2, 1, 2, 3]`. For 1 it produces `[1]`, for 2 it produces `[1, 2]`, and for 3 it produces `[1, 2, 3]`, all of which are concatenated and flattened into a single list.

---

### Question 60

Predict the output of sc.parallelize([1, 2, 3]).map(lambda x: range(1, x + 1)).collect().

**Answer:** Output: `[range(1, 2), range(1, 3), range(1, 4)]` (or when converted to lists: `[[1], [1, 2], [1, 2, 3]]`). Each input element produces a distinct iterable range object without flattening.

---

## Part VII: Actions, Persistence & Caching

### Question 61

What physical event occurs inside the Spark cluster when an Action is executed on an RDD?

**Answer:** An Action triggers DAG compilation: the DAGScheduler breaks the lineage into physical stages at shuffle boundaries, stages are divided into tasks corresponding to partition counts, and the TaskScheduler dispatches those tasks to Executor threads across cluster nodes to run and return results.

---

### Question 62

What is the difference between rdd.collect() and rdd.take(10) regarding driver memory consumption and network traffic?

**Answer:** `rdd.collect()` pulls every partition of the entire distributed dataset over the network into the Driver's single memory heap, causing high network traffic and severe risk of Driver OOM crashes. `rdd.take(10)` accesses only the first partition (or minimal partitions required), transmitting only 10 records over the network with negligible memory impact.

---

### Question 63

Explain why executing rdd.collect() on a 500 GB dataset will likely crash the Spark Driver application.

**Answer:** The Spark Driver process runs with a finite JVM heap size (typically 1 GB to 8 GB by default). Attempting to deserialize and assemble 500 GB of distributed partition data onto a single machine will instantly exhaust the Driver heap, triggering a fatal `java.lang.OutOfMemoryError` and terminating the application.

---

### Question 64

What does rdd.cache() do, and what default storage level does it use for PySpark RDDs?

**Answer:** `rdd.cache()` persists computed RDD partitions in executor memory so they can be reused across subsequent actions without recomputing lineage. For PySpark RDDs, the default storage level is `MEMORY_ONLY_SER` (stored in the JVM heap as serialized byte arrays representing Python objects).

---

### Question 65

Explain the differences between the following StorageLevel settings: MEMORY_ONLY, MEMORY_AND_DISK, and MEMORY_ONLY_SER.

**Answer:** `MEMORY_ONLY` stores partitions as deserialized Java objects in memory for fastest access but highest memory consumption. `MEMORY_AND_DISK` caches in RAM and spills excess partitions to local disk when memory is full. `MEMORY_ONLY_SER` stores partitions as serialized byte buffers in memory, reducing memory footprint at the expense of CPU serialization overhead.

---

### Question 66

Why is unpersisting an RDD (rdd.unpersist()) important in long-running PySpark applications?

**Answer:** Cached RDDs remain pinned in executor memory for the entire lifetime of the application. Explicitly calling `rdd.unpersist()` releases memory blocks, preventing heap fragmentation, reducing garbage collection pressure, and freeing space for subsequent execution stages and shuffles.

---

### Question 67

Describe a scenario where caching an intermediate RDD significantly degrades performance instead of improving it.

**Answer:** Caching an RDD that is only evaluated once degrades performance because serializing and writing data to cache buffers wastes CPU and RAM with zero benefit. Furthermore, if the cached RDD is very large, it evicts other active data and starves execution memory, causing expensive disk spills and long garbage collection pauses.

---

### Question 68

What does rdd.reduce(lambda a, b: a + b) return to the caller, and how does it differ from rdd.reduceByKey(lambda a, b: a + b)?

**Answer:** `rdd.reduce()` is an action that aggregates all elements across the entire RDD into a single scalar value returned directly to the Driver program. `rdd.reduceByKey()` is a transformation on Pair RDDs that aggregates values on a per-key basis, producing a new distributed Pair RDD across cluster partitions.

---

### Question 69

Explain why the binary operator function passed into .reduce() must be associative and commutative.

**Answer:** Because partitions are processed concurrently on distributed nodes and combined in non-deterministic order, associativity (a + b) + c = a + (b + c) and commutativity a + b = b + a guarantee that the final combined result is mathematically identical regardless of task scheduling sequence.

---

### Question 70

What does rdd.saveAsTextFile("hdfs://path") do, and how many output files will be created in the target directory?

**Answer:** It writes the RDD's records as text lines into the specified directory in HDFS or persistent storage. The target directory will contain exactly one output file per partition (named `part-00000`, `part-00001`, etc.) plus a `_SUCCESS` completion marker.

---

## Part VIII: MapReduce Pair RDD Operations & Shuffle Optimization

### Question 71

What is a Pair RDD in PySpark, and what special transformation methods become available when an RDD contains (K, V) tuples?

**Answer:** A Pair RDD is an RDD where every element is a two-element tuple representing a `(key, value)` pair. When structured as pairs, specialized key-centric methods become available, including `reduceByKey()`, `groupByKey()`, `aggregateByKey()`, `combineByKey()`, `mapValues()`, `join()`, and `cogroup()`.

---

### Question 72

Define the Shuffle process in Apache Spark and identify the physical resources (Disk, Network, CPU) it consumes.

**Answer:** A Shuffle is the redistribution of data across cluster partitions and machines so records sharing the same key are grouped together. It consumes Disk (writing and reading local shuffle spill files), Network (transferring partition blocks across worker nodes), and CPU/Memory (serialization, deserialization, buffer management, and key sorting).

---

### Question 73

Compare the execution mechanics and network overhead of reduceByKey() versus groupByKey().

**Answer:** `reduceByKey()` performs map-side combining, pre-aggregating values for each key locally on each worker so only one combined value per key is sent over the network. `groupByKey()` transmits all raw, individual values across the network without combining, causing severe network congestion, disk spilling, and memory crashes.

---

### Question 74

What is Map-side Combining (combiner), and why does reduceByKey() perform map-side combining while groupByKey() cannot?

**Answer:** Map-side combining is the local aggregation of values for identical keys within a partition before data is shuffled across the network. `reduceByKey()` can combine because it receives an associative reduction function that reduces pairs into single values, whereas `groupByKey()` is designed to collect all raw values into an iterable collection and cannot reduce data volume prior to shuffling.

---

### Question 75

Write a PySpark code snippet using reduceByKey() to calculate the total revenue per product ID from an RDD of (product_id, price) tuples.

**Answer:** Code: `total_revenue = rdd.reduceByKey(lambda a, b: a + b)`. This sums all price values for each unique `product_id` key with map-side combining enabled.

---

### Question 76

Write a PySpark pipeline using aggregateByKey() or combineByKey() to calculate the average price per product ID without using groupByKey().

**Answer:** Code: `avg_price = rdd.aggregateByKey((0.0, 0), lambda acc, val: (acc[0] + val, acc[1] + 1), lambda a1, a2: (a1[0] + a2[0], a1[1] + a2[1])).mapValues(lambda pair: pair[0] / pair[1])`. This computes running sum and count per key efficiently with local combining before calculating the mean.

---

### Question 77

What is the output of rdd.sortByKey() versus rdd.sortBy(), and do these operations trigger a shuffle?

**Answer:** `rdd.sortByKey()` sorts a Pair RDD strictly by its keys, whereas `rdd.sortBy(func)` sorts any RDD based on a custom key-extractor function. Both operations require range-partitioning across cluster nodes and therefore always trigger a network shuffle.

---

### Question 78

How does join() work between two Pair RDDs (K, V) and (K, W), and what causes a massive shuffle during a join?

**Answer:** `join()` performs an inner join matching keys across `(K, V)` and `(K, W)` to emit `(K, (V, W))`. Because matching keys initially reside on arbitrary partitions across different cluster nodes, Spark must rehash and redistribute all records from both RDDs across the network, generating massive shuffle traffic.

---

### Question 79

What is a Broadcast Join (Map-Side Join), and how can it be used to eliminate shuffles when joining a large RDD with a small lookup table?

**Answer:** A Broadcast Join sends a small lookup dataset to all worker executors as an in-memory dictionary using `sc.broadcast()`. Worker tasks executing over the large RDD match keys directly against the local in-memory dictionary within a narrow `map()` or `flatMap()`, eliminating the shuffle of the large RDD entirely.

---

### Question 80

What is cogroup(), and what data structure does it produce when applied to two Pair RDDs?

**Answer:** `cogroup()` groups data from two Pair RDDs `(K, V)` and `(K, W)` sharing identical keys without requiring matches in both. For each key, it produces a tuple containing iterables of values from both RDDs: `(K, (ResultIterable[V], ResultIterable[W]))`.

---

## Part IX: MapReduce Code Tracing & Pipeline Design

### Question 81

Trace the pipeline and state the exact output of counts.collect(): lines = sc.parallelize(["apple banana apple", "banana cherry"]); words = lines.flatMap(lambda line: line.split()); pairs = words.map(lambda word: (word, 1)); counts = pairs.reduceByKey(lambda a, b: a + b).

**Answer:** The flatMap produces `['apple', 'banana', 'apple', 'banana', 'cherry']`. The map pairs them with 1, and `reduceByKey` sums occurrences per word. Exact output: `[('apple', 2), ('banana', 2), ('cherry', 1)]` (partition ordering may vary).

---

### Question 82

Modify the code in Question 81 to filter out words that appear fewer than 2 times across the entire corpus.

**Answer:** Code: `filtered_counts = counts.filter(lambda pair: pair[1] >= 2)`. This applies a `.filter()` condition on the resulting `(word, count)` Pair RDD, keeping only entries where count is 2 or higher (retaining 'apple' and 'banana').

---

### Question 83

Given an RDD of web server log entries in string format "IP_ADDRESS - - [DATE] \"GET /URL HTTP/1.1\" STATUS SIZE", outline the transformation steps needed to find the top 5 most frequently requested URLs.

**Answer:** Code: `top_5_urls = logs.map(lambda line: (line.split('"')[1].split()[1], 1)).reduceByKey(lambda a, b: a + b).takeOrdered(5, key=lambda pair: -pair[1])`. Step 1: map lines to extract URL as key and count 1. Step 2: aggregate counts with `reduceByKey`. Step 3: extract top 5 via `takeOrdered` in descending count order.

---

### Question 84

Trace the output of: rdd = sc.parallelize([("A",1),("B",2),("A",4),("B",6),("C",5)]); result = rdd.reduceByKey(lambda x,y: x if x > y else y).collect().

**Answer:** The lambda computes the maximum value for each key: for 'A' max(1, 4) = 4, for 'B' max(2, 6) = 6, and for 'C' 5. Exact output: `[('A', 4), ('B', 6), ('C', 5)]` (order may vary).

---

### Question 85

Given rdd = sc.parallelize([1,2,3,4]), what is the result of rdd.fold(0, lambda x, y: x + y)?

**Answer:** The result is 10. The fold operation applies addition using identity value 0 within each partition (1 + 2 + 3 + 4 = 10), and subsequently combines partition results with 0 at the Driver.

---

### Question 86

How does fold() differ from reduce(), and why must the zero value (identity element) be carefully chosen?

**Answer:** `reduce()` operates strictly on elements within the dataset, whereas `fold()` initializes aggregation with a specified zero value applied per partition and again when merging partition results. The zero value must be the mathematical identity element (e.g., 0 for addition, 1 for multiplication) or the initial value will be accumulated multiple times across partitions, producing incorrect totals.

---

### Question 87

Trace the output of: rdd = sc.parallelize([("K1",10),("K2",20),("K1",30)]); res = rdd.groupByKey().mapValues(lambda vals: sum(vals) / len(vals)).collect().

**Answer:** For 'K1', values are `[10, 30]`, giving average (10 + 30) / 2 = 20.0. For 'K2', values are `[20]`, giving average 20 / 1 = 20.0. Exact output: `[('K1', 20.0), ('K2', 20.0)]`.

---

### Question 88

Identify the performance issue in Question 87 and rewrite the pipeline using aggregateByKey() to improve efficiency.

**Answer:** The performance issue is `groupByKey()`, which shuffles all unaggregated values across the network without map-side combining, risking network saturation and memory spills. Optimized rewrite: `res = rdd.aggregateByKey((0.0, 0), lambda acc, v: (acc[0] + v, acc[1] + 1), lambda a1, a2: (a1[0] + a2[0], a1[1] + a2[1])).mapValues(lambda pair: pair[0] / pair[1]).collect()`.

---

### Question 89

Given an RDD of numbers [10, 15, 20, 25, 30], write a single PySpark pipeline that computes both the minimum and maximum values in a single pass.

**Answer:** Code: `min_max = rdd.map(lambda x: (x, x)).reduce(lambda a, b: (min(a[0], b[0]), max(a[1], b[1])))`. Each number is mapped to `(val, val)` representing `(current_min, current_max)`, and `.reduce()` computes the global minimum and maximum concurrently across all partitions in one pass.

---

### Question 90

Explain how inverted indexing (building a mapping from Word → List of Document IDs) can be implemented using flatMap() and reduceByKey().

**Answer:** Code: `inverted_index = docs.flatMap(lambda doc: [((w, doc[0]), None) for w in set(doc[1].split())]).map(lambda pair: (pair[0][0], [pair[0][1]])).reduceByKey(lambda a, b: a + b)`. Step 1: `flatMap` maps (doc_id, text) to unique ((word, doc_id), None) pairs. Step 2: `map` formats each entry as (word, [doc_id]). Step 3: `reduceByKey` concatenates document ID lists for matching words.

---

## Part X: Debugging, Code Reasoning & AI-Code Verification

### Question 91

Identify the conceptual bug in this PySpark Word Count snippet: words = lines.map(lambda line: line.split()); counts = words.map(lambda word: (word, 1)).reduceByKey(lambda a, b: a + b).

**Answer:** `lines.map(lambda line: line.split())` produces an RDD of lists (e.g., `[['hello', 'world']]`). Calling `.map(lambda word: (word, 1))` subsequently pairs each entire list as a key (e.g., `(['hello', 'world'], 1)`), which fails because Python lists are unhashable. The first transformation must be `flatMap()`, not `map()`.

---

### Question 92

Identify the logical bug in this code intended to keep even numbers: evens = rdd.filter(lambda x: x % 2). (Hint: evaluate Python truthiness for 0 vs 1.)

**Answer:** In Python, `x % 2` returns 0 for even numbers and 1 for odd numbers. In boolean evaluation, 0 is False and 1 is True, meaning `filter(lambda x: x % 2)` discards even numbers and retains odd numbers. The correct predicate is `lambda x: x % 2 == 0`.

---

### Question 93

An AI assistant generates PySpark code to process 1 TB of log files using data = sc.textFile("hdfs://logs/*.log").collect(); parsed = [line.split(",") for line in data if "ERROR" in line]. Explain why this fails in production and provide the correct distributed PySpark replacement.

**Answer:** Calling `.collect()` brings the entire 1 TB dataset over the network into the single Driver machine's RAM, causing an instant `OutOfMemoryError` crash. The correct distributed replacement filters and parses data in parallel across worker nodes: `parsed = sc.textFile('hdfs://logs/*.log').filter(lambda line: 'ERROR' in line).map(lambda line: line.split(','))`.

---

### Question 94

An AI tool suggests using rdd.groupByKey().mapValues(sum) for a large dataset. Explain what critique you would give to the AI and what alternative method you would mandate.

**Answer:** Critique: `groupByKey()` transfers all individual records across the network without map-side combining, causing severe network saturation, disk spilling, and worker OOM crashes. Mandate: replace with `rdd.reduceByKey(lambda a, b: a + b)`, which performs map-side combining to pre-aggregate values locally before shuffling.

---

### Question 95

You run a PySpark job and observe in the Spark UI that 199 out of 200 tasks complete in 5 seconds, but the 200th task hangs for 2 hours. What is this phenomenon called, and what are its primary causes?

**Answer:** This phenomenon is called a Straggler Task (caused by Data Skew). Primary causes include severe data skew where a single key holds a massive fraction of records, inefficient custom partitioners, or a degraded/failing hardware worker node.

---

### Question 96

How would you debug an Out-Of-Memory (java.lang.OutOfMemoryError: Java heap space) error occurring during a PySpark reduceByKey() operation?

**Answer:** Step 1: Check the Spark UI Stages tab to see if input partition sizes or shuffle read sizes are heavily skewed across tasks. Step 2: Increase partition count by supplying `numPartitions` (e.g., `reduceByKey(func, numPartitions=2000)`). Step 3: Salt heavily skewed keys with random prefixes to distribute hotspots across multiple tasks. Step 4: Increase executor memory (`spark.executor.memory`) or adjust executor memory fraction (`spark.memory.fraction`).

---

### Question 97

What systematic verification steps should you perform when prompting an LLM to generate PySpark code for data transformation pipelines?

**Answer:** Step 1: Test logic on a tiny, verifiable local dataset. Step 2: Audit operations to confirm they remain distributed (ensure no improper `collect()` or `toPandas()`). Step 3: Identify wide transformations and replace `groupByKey()` with `reduceByKey()` or broadcast joins. Step 4: Verify associativity and commutativity for reduction functions. Step 5: Test boundary conditions: empty partitions, null values, malformed records, and skewed keys.

---

### Question 98

Explain why testing AI-generated PySpark code on a small local driver dataset (sc.parallelize) may conceal memory leak or shuffle bugs that appear on a real cluster.

**Answer:** In local mode with small datasets, all execution runs in a single process without network latency, serialization over IPC sockets, multi-node memory limits, or real shuffle boundaries. Crucial distributed failure modes—such as unpickleable closures, executor heap exhaustion, network shuffle timeouts, and straggler data skew—only manifest under cluster scale.

---

### Question 99

A student writes rdd.map(lambda x: print(x)).collect(). Why is using print() inside an RDD transformation considered bad practice, and where does the printed output actually go?

**Answer:** Using `print()` inside a transformation is bad practice because transformations execute remotely on worker nodes, sending stdout to the worker executor's stdout log files (viewable only in Spark/YARN UI logs, not on the driver console). Furthermore, due to lazy evaluation and potential task re-executions, `print()` may execute zero, one, or multiple times.

---

### Question 100

Formulate a code review checklist containing 5 mandatory technical criteria that every production PySpark RDD pipeline must pass before deployment.

**Answer:** 1. Zero Unsafe Actions: No unconditional `.collect()` or driver-pulling operations on unbounded datasets. 2. Shuffle Efficiency: No `groupByKey()` for reductions; use `reduceByKey()` / `aggregateByKey()` and broadcast small lookup tables. 3. Partitioning & Skew Health: Partition count matches 2–4x cluster cores; no skewed partition stragglers. 4. Serialization Safety: No unpickleable objects (e.g., SparkContext, open sockets) captured in worker closures. 5. Caching Hygiene: Explicit storage levels for reused RDDs, with corresponding `.unpersist()` calls after use.

---


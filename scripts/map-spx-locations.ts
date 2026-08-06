import "dotenv/config";

import {
  MongoClient,
  type AnyBulkWriteOperation,
  type Collection,
  type Document,
} from "mongodb";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB ?? "geo";

const dryRun = process.env.DRY_RUN !== "false";
const bulkSize = Number(process.env.BULK_SIZE ?? "500");

if (!uri) {
  throw new Error("MONGODB_URI is missing");
}

if (!Number.isInteger(bulkSize) || bulkSize < 1) {
  throw new Error("BULK_SIZE must be a positive integer");
}

type SpxMapping = {
  province: string;
  district: string;
  ward: string;
  location_count: number;
};

type GeometryGroup = {
  _id: string;
  mappings: SpxMapping[];
  total_locations: number;
};

type AdminLocation = {
  _id: unknown;
  name?: string;
  display_name?: string;
  parent_id?: string | null;
  level?: number;
  province_name?: string;
  geometry_key: string;
};

async function runBulkWrite(
  collection: Collection<Document>,
  operations: AnyBulkWriteOperation<Document>[],
): Promise<{
  matchedCount: number;
  modifiedCount: number;
}> {
  let matchedCount = 0;
  let modifiedCount = 0;

  for (let index = 0; index < operations.length; index += bulkSize) {
    const chunk = operations.slice(index, index + bulkSize);

    if (dryRun) {
      continue;
    }

    const result = await collection.bulkWrite(chunk, {
      ordered: false,
    });

    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;

    console.log(
      `Bulk progress: ${Math.min(
        index + chunk.length,
        operations.length,
      )}/${operations.length}`,
    );
  }

  return {
    matchedCount,
    modifiedCount,
  };
}

async function main(): Promise<void> {
  const client = new MongoClient(uri as any);

  try {
    await client.connect();

    const database = client.db(databaseName);

    const adminLocations =
      database.collection<Document>("admin_locations");

    const spxLocations =
      database.collection<Document>("spx_locations");

    console.log(`Connected to database: ${databaseName}`);
    console.log(`Dry run: ${dryRun}`);

    /*
     * Group SPX records by:
     *
     * geometry_key
     * Province
     * District
     * Ward
     *
     * Multiple SPX coordinates belonging to the same carrier ward
     * become one mapping entry with location_count.
     */
    const geometryGroups = await spxLocations
      .aggregate<GeometryGroup>([
        {
          $match: {
            geometry_key: {
              $type: "string",
              $ne: "",
            },
          },
        },
        {
          $set: {
            _mapping_province: {
              $trim: {
                input: {
                  $ifNull: ["$Province", ""],
                },
              },
            },
            _mapping_district: {
              $trim: {
                input: {
                  $ifNull: ["$District", ""],
                },
              },
            },
            _mapping_ward: {
              $trim: {
                input: {
                  $ifNull: ["$Ward", ""],
                },
              },
            },
          },
        },
        {
          $match: {
            _mapping_ward: {
              $ne: "",
            },
          },
        },
        {
          $group: {
            _id: {
              geometry_key: "$geometry_key",
              province: "$_mapping_province",
              district: "$_mapping_district",
              ward: "$_mapping_ward",
            },
            location_count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            "_id.geometry_key": 1,
            "_id.province": 1,
            "_id.district": 1,
            "_id.ward": 1,
          },
        },
        {
          $group: {
            _id: "$_id.geometry_key",
            mappings: {
              $push: {
                province: "$_id.province",
                district: "$_id.district",
                ward: "$_id.ward",
                location_count: "$location_count",
              },
            },
            total_locations: {
              $sum: "$location_count",
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray();

    console.log(
      `SPX geometry groups found: ${geometryGroups.length}`,
    );

    /*
     * Load new administrative locations and create a lookup by
     * geometry_key.
     */
    const adminDocuments = (await adminLocations
      .find(
        {
          geometry_key: {
            $type: "string",
            $ne: "",
          },
        },
        {
          projection: {
            _id: 1,
            name: 1,
            display_name: 1,
            parent_id: 1,
            level: 1,
            province_name: 1,
            geometry_key: 1,
          },
        },
      )
      .toArray()) as AdminLocation[];

    const adminByGeometryKey = new Map<
      string,
      AdminLocation
    >();

    const duplicateGeometryKeys = new Set<string>();

    for (const admin of adminDocuments) {
      const geometryKey = admin.geometry_key;

      if (adminByGeometryKey.has(geometryKey)) {
        duplicateGeometryKeys.add(geometryKey);
        continue;
      }

      adminByGeometryKey.set(geometryKey, admin);
    }

    /*
     * Do not automatically use an ambiguous geometry_key.
     */
    for (const geometryKey of duplicateGeometryKeys) {
      adminByGeometryKey.delete(geometryKey);
    }

    if (duplicateGeometryKeys.size > 0) {
      console.warn(
        `Duplicate admin geometry keys: ${duplicateGeometryKeys.size}`,
      );

      console.warn(
        Array.from(duplicateGeometryKeys).slice(0, 20),
      );
    }

    const adminOperations: AnyBulkWriteOperation<Document>[] =
      [];

    const spxOperations: AnyBulkWriteOperation<Document>[] = [];

    let matchedGeometryKeys = 0;
    let missingAdminGeometryKeys = 0;
    let mappedSpxDocuments = 0;
    let multipleOldWardMappings = 0;

    const missingSamples: string[] = [];
    const mappingSamples: unknown[] = [];

    const now = new Date();

    for (const group of geometryGroups) {
      const geometryKey = group._id;
      const admin = adminByGeometryKey.get(geometryKey);

      if (!admin) {
        missingAdminGeometryKeys++;

        if (missingSamples.length < 20) {
          missingSamples.push(geometryKey);
        }

        continue;
      }

      matchedGeometryKeys++;
      mappedSpxDocuments += group.total_locations;

      if (group.mappings.length > 1) {
        multipleOldWardMappings++;
      }

      /*
       * New admin location:
       * save all old SPX province/district/ward combinations.
       *
       * This replaces shipping_mappings.spx with the complete,
       * deterministic array each time the script runs.
       */
      adminOperations.push({
        updateOne: {
          filter: {
            _id: admin._id as any,
            geometry_key: geometryKey,
          },
          update: {
            $set: {
              "shipping_mappings.spx": group.mappings,
              "shipping_mappings.spx_updated_at": now,
            },
          },
        },
      });

      /*
       * Every SPX location sharing this geometry_key receives the
       * same new administrative target.
       */
      spxOperations.push({
        updateMany: {
          filter: {
            geometry_key: geometryKey,
          },
          update: {
            $set: {
              "shipping_mappings.admin_location": {
                id: admin._id,
                name: admin.name ?? null,
                display_name: admin.display_name ?? null,
                parent_id: admin.parent_id ?? null,
                level: admin.level ?? null,
                province_name: admin.province_name ?? null,
                geometry_key: geometryKey,
              },
              "shipping_mappings.admin_location_updated_at":
                now,
            },
          },
        },
      });

      if (mappingSamples.length < 10) {
        mappingSamples.push({
          geometry_key: geometryKey,
          new_admin_location: {
            id: admin._id,
            name: admin.name,
            display_name: admin.display_name,
          },
          old_spx_locations: group.mappings,
          total_spx_documents: group.total_locations,
        });
      }
    }

    console.log("\nSample mappings:");

    console.dir(mappingSamples, {
      depth: null,
    });

    console.log("\nPrepared operations:");

    console.table({
      matchedGeometryKeys,
      missingAdminGeometryKeys,
      mappedSpxDocuments,
      multipleOldWardMappings,
      adminUpdateOperations: adminOperations.length,
      spxUpdateManyOperations: spxOperations.length,
    });

    if (missingSamples.length > 0) {
      console.warn(
        "\nGeometry keys found in SPX but missing or ambiguous in admin_locations:",
      );

      console.warn(missingSamples);
    }

    if (dryRun) {
      console.log(
        "\nNo records changed because DRY_RUN=true.",
      );

      console.log(
        "Review the sample mappings, then run with DRY_RUN=false.",
      );

      return;
    }

    console.log("\nUpdating admin_locations...");

    const adminResult = await runBulkWrite(
      adminLocations,
      adminOperations,
    );

    console.log("\nUpdating spx_locations...");

    const spxResult = await runBulkWrite(
      spxLocations,
      spxOperations,
    );

    console.log("\nCompleted");

    console.table({
      matchedGeometryKeys,
      mappedSpxDocuments,
      adminMatched: adminResult.matchedCount,
      adminModified: adminResult.modifiedCount,
      spxMatched: spxResult.matchedCount,
      spxModified: spxResult.modifiedCount,
      missingAdminGeometryKeys,
      duplicateGeometryKeys: duplicateGeometryKeys.size,
    });
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Shipping mapping migration failed:", error);
  process.exitCode = 1;
});
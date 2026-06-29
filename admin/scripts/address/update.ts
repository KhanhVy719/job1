import mongoose from "mongoose";
import dbConnect from "@/utils/mongodb";
import Province from "@/model/Province";
import Ward from "@/model/Ward";

const DATA_URL =
  "https://raw.githubusercontent.com/qtv100291/Vietnam-administrative-division-json-server/refs/heads/master/db.json";

interface IRawProvince {
  idProvince: string;
  name: string;
}

interface IRawCommune {
  idProvince: string;
  idCommune: string;
  name: string;
}

class AddressUpdater {
    
  async fetchData(): Promise<{ provinces: IRawProvince[]; communes: IRawCommune[] }> {
    console.log("🔄 Fetching data...");
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`❌ Failed to fetch data: ${res.statusText}`);
    const data = await res.json();

    return {
      provinces: data.province || [],
      communes: data.commune || [],
    };
  }

  async updateProvinces(provinces: IRawProvince[]): Promise<void> {
    console.log("📌 Updating provinces...");

    const ops = provinces.map((p) => ({
      updateOne: {
        filter: { code: p.idProvince },
        update: { $setOnInsert: { code: p.idProvince, name: p.name } },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Province.bulkWrite(ops);
      console.log(`✅ Synced ${provinces.length} provinces`);
    }
  }

  async updateWards(communes: IRawCommune[]): Promise<void> {
    console.log("📌 Updating wards...");

    const ops = communes.map((c) => ({
      updateOne: {
        filter: { code: c.idCommune },
        update: {
          $setOnInsert: {
            code: c.idCommune,
            name: c.name,
            province_code: c.idProvince,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Ward.bulkWrite(ops);
      console.log(`✅ Synced ${communes.length} wards`);
    }
  }

  async run(): Promise<void> {
    try {
      await dbConnect();

      const { provinces, communes } = await this.fetchData();
      await this.updateProvinces(provinces);
      await this.updateWards(communes);

      console.log("🎉 Update completed!");
    } catch (error) {
      console.error("❌ Error updating:", error);
    } finally {
      await mongoose.disconnect();
    }
  }
}

new AddressUpdater().run();

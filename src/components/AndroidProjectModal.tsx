import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Smartphone,
  Terminal,
  Code2,
} from 'lucide-react';

interface AndroidProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<string>('MainActivity.kt');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const projectFiles: Record<string, { path: string; language: string; content: string }> = {
    'MainActivity.kt': {
      path: 'app/src/main/java/com/biryanishop/billing/MainActivity.kt',
      language: 'kotlin',
      content: `package com.biryanishop.billing

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import com.biryanishop.billing.data.AppDatabase
import com.biryanishop.billing.ui.screens.*
import com.biryanishop.billing.ui.theme.BiryaniShopTheme

enum class Screen {
    OPENING,
    OWNER_LOGIN,
    OWNER_DASHBOARD,
    EMPLOYEE_LOGIN,
    EMPLOYEE_PAGE_1_BILLING,
    EMPLOYEE_PAGE_2_HISTORY
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val db = AppDatabase.getDatabase(applicationContext)

        setContent {
            BiryaniShopTheme {
                var currentScreen by remember { mutableStateOf(Screen.OPENING) }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFF1F5F9)
                ) {
                    when (currentScreen) {
                        Screen.OPENING -> OpeningScreen(
                            onOwnerSelected = { currentScreen = Screen.OWNER_LOGIN },
                            onEmployeeSelected = { currentScreen = Screen.EMPLOYEE_LOGIN }
                        )
                        Screen.OWNER_LOGIN -> OwnerLoginScreen(
                            onSuccess = { currentScreen = Screen.OWNER_DASHBOARD },
                            onBack = { currentScreen = Screen.OPENING }
                        )
                        Screen.OWNER_DASHBOARD -> OwnerDashboardScreen(
                            db = db,
                            onLogout = { currentScreen = Screen.OPENING }
                        )
                        Screen.EMPLOYEE_LOGIN -> EmployeeLoginScreen(
                            onSuccess = { currentScreen = Screen.EMPLOYEE_PAGE_1_BILLING },
                            onBack = { currentScreen = Screen.OPENING }
                        )
                        Screen.EMPLOYEE_PAGE_1_BILLING -> EmployeeBillingScreen(
                            db = db,
                            onNavigateToHistory = { currentScreen = Screen.EMPLOYEE_PAGE_2_HISTORY },
                            onLogout = { currentScreen = Screen.OPENING }
                        )
                        Screen.EMPLOYEE_PAGE_2_HISTORY -> EmployeeHistoryScreen(
                            db = db,
                            onNavigateToBilling = { currentScreen = Screen.EMPLOYEE_PAGE_1_BILLING },
                            onLogout = { currentScreen = Screen.OPENING }
                        )
                    }
                }
            }
        }
    }
}`,
    },
    'AppDatabase.kt': {
      path: 'app/src/main/java/com/biryanishop/billing/data/AppDatabase.kt',
      language: 'kotlin',
      content: `package com.biryanishop.billing.data

import android.content.Context
import androidx.room.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class Converters {
    @TypeConverter
    fun fromItemList(value: List<BillItemSnapshot>): String {
        val gson = Gson()
        return gson.toJson(value)
    }

    @TypeConverter
    fun toItemList(value: String): List<BillItemSnapshot> {
        val listType = object : TypeToken<List<BillItemSnapshot>>() {}.type
        return Gson().fromJson(value, listType)
    }
}

@Database(entities = [CatalogItemEntity::class, BillEntity::class, ShopConfigEntity::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun billDao(): BillDao
    abstract fun configDao(): ShopConfigDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "biryani_shop_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}`,
    },
    'EntitiesAndDaos.kt': {
      path: 'app/src/main/java/com/biryanishop/billing/data/EntitiesAndDaos.kt',
      language: 'kotlin',
      content: `package com.biryanishop.billing.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "catalog_items")
data class CatalogItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val price: Double,
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface ItemDao {
    @Query("SELECT * FROM catalog_items ORDER BY name ASC")
    fun getAllItems(): Flow<List<CatalogItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: CatalogItemEntity): Long

    @Update
    suspend fun updateItem(item: CatalogItemEntity)

    @Delete
    suspend fun deleteItem(item: CatalogItemEntity)
}

data class BillItemSnapshot(
    val itemId: Long,
    val name: String,
    val unitPrice: Double,
    val quantity: Int,
    val lineTotal: Double
)

@Entity(tableName = "saved_bills")
data class BillEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val billNumber: String,
    val timestamp: Long = System.currentTimeMillis(),
    val dateString: String,
    val timeString: String,
    val items: List<BillItemSnapshot>,
    val totalAmount: Double,
    val totalQuantity: Int,
    val printCount: Int = 0
)

@Dao
interface BillDao {
    @Query("SELECT * FROM saved_bills ORDER BY timestamp DESC")
    fun getAllBills(): Flow<List<BillEntity>>

    @Query("SELECT * FROM saved_bills WHERE dateString = :date ORDER BY timestamp DESC")
    fun getBillsForDate(date: String): Flow<List<BillEntity>>

    @Query("SELECT * FROM saved_bills WHERE billNumber LIKE '%' || :query || '%' ORDER BY timestamp DESC")
    fun searchBills(query: String): Flow<List<BillEntity>>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertBill(bill: BillEntity): Long

    @Query("UPDATE saved_bills SET printCount = printCount + 1 WHERE id = :billId")
    suspend fun incrementPrintCount(billId: Long)
    
    @Query("SELECT COUNT(*) FROM saved_bills WHERE dateString = :date")
    suspend fun getTodayBillCount(date: String): Int

    @Query("SELECT COALESCE(SUM(totalAmount), 0.0) FROM saved_bills WHERE dateString = :date")
    suspend fun getTodayTotalSales(date: String): Double
}

@Entity(tableName = "shop_config")
data class ShopConfigEntity(
    @PrimaryKey val id: Int = 1,
    val shopName: String = "",
    val phone: String = "",
    val ownerPin: String = "8888",
    val employeePin: String = "1234",
    val paperWidth: String = "58mm"
)

@Dao
interface ShopConfigDao {
    @Query("SELECT * FROM shop_config WHERE id = 1 LIMIT 1")
    fun getConfig(): Flow<ShopConfigEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveConfig(config: ShopConfigEntity)
}`,
    },
    'BluetoothPrintManager.kt': {
      path: 'app/src/main/java/com/biryanishop/billing/bluetooth/BluetoothPrintManager.kt',
      language: 'kotlin',
      content: `package com.biryanishop.billing.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import com.biryanishop.billing.data.BillEntity
import com.biryanishop.billing.data.ShopConfigEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.util.UUID

object BluetoothPrintManager {
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    @SuppressLint("MissingPermission")
    suspend fun printBill(
        device: BluetoothDevice,
        bill: BillEntity,
        config: ShopConfigEntity?
    ): Result<Unit> = withContext(Dispatchers.IO) {
        var socket: BluetoothSocket? = null
        try {
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()
            val outputStream: OutputStream = socket.outputStream

            val is80mm = config?.paperWidth == "80mm"
            val lineWidth = if (is80mm) 48 else 32

            outputStream.write(byteArrayOf(0x1B, 0x40))
            outputStream.write(byteArrayOf(0x1B, 0x61, 0x01))

            val name = config?.shopName?.trim()
            if (!name.isNullOrEmpty()) {
                outputStream.write(byteArrayOf(0x1D, 0x21, 0x11))
                outputStream.write("\${name.uppercase()}\\n".toByteArray())
                outputStream.write(byteArrayOf(0x1D, 0x21, 0x00))
            } else {
                outputStream.write("CASH BILL\\n".toByteArray())
            }

            if (!config?.phone.isNullOrEmpty()) {
                outputStream.write("Tel: \${config?.phone}\\n".toByteArray())
            }
            outputStream.write("=".repeat(lineWidth).plus("\\n").toByteArray())

            outputStream.write(byteArrayOf(0x1B, 0x61, 0x00))
            outputStream.write("Bill No: \${bill.billNumber}\\n".toByteArray())
            outputStream.write("Date: \${bill.dateString} \${bill.timeString}\\n".toByteArray())
            outputStream.write("-".repeat(lineWidth).plus("\\n").toByteArray())

            if (is80mm) {
                outputStream.write(String.format("%-20s %5s %10s %10s\\n", "ITEM", "QTY", "RATE", "TOTAL").toByteArray())
            } else {
                outputStream.write(String.format("%-14s %4s %6s %6s\\n", "ITEM", "QTY", "RATE", "TOTAL").toByteArray())
            }
            outputStream.write("-".repeat(lineWidth).plus("\\n").toByteArray())

            for (item in bill.items) {
                val itemName = if (item.name.length > 13) item.name.substring(0, 13) else item.name
                val line = if (is80mm) {
                    String.format("%-20s %5d %10.0f %10.0f\\n", itemName, item.quantity, item.unitPrice, item.lineTotal)
                } else {
                    String.format("%-14s %4d %6.0f %6.0f\\n", itemName, item.quantity, item.unitPrice, item.lineTotal)
                }
                outputStream.write(line.toByteArray())
            }

            outputStream.write("-".repeat(lineWidth).plus("\\n").toByteArray())

            outputStream.write(byteArrayOf(0x1B, 0x45, 0x01))
            val totalLine = String.format("TOTAL AMOUNT: Rs. %.0f\\n", bill.totalAmount)
            outputStream.write(totalLine.toByteArray())
            outputStream.write(byteArrayOf(0x1B, 0x45, 0x00))

            outputStream.write("=".repeat(lineWidth).plus("\\n").toByteArray())
            outputStream.write(byteArrayOf(0x1B, 0x61, 0x01))
            outputStream.write("*** THANK YOU ***\\n\\n\\n\\n".toByteArray())
            outputStream.write(byteArrayOf(0x1D, 0x56, 0x42, 0x00))
            outputStream.flush()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        } finally {
            try {
                socket?.close()
            } catch (_: Exception) {}
        }
    }
}`,
    },
    'AndroidManifest.xml': {
      path: 'app/src/main/AndroidManifest.xml',
      language: 'xml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Biryani Billing POS"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BiryaniShop">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:theme="@style/Theme.BiryaniShop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`,
    },
    'build.gradle.kts': {
      path: 'app/build.gradle.kts',
      language: 'kotlin',
      content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.biryanishop.billing"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.biryanishop.billing"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    implementation(libs.gson)
}`,
    },
  };

  const handleCopy = () => {
    const text = projectFiles[selectedFile]?.content || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    let bundle = `# Biryani Shop Billing - Native Android Studio Project\n# Kotlin, Jetpack Compose, Room SQLite, Bluetooth ESC/POS\n\n`;
    Object.entries(projectFiles).forEach(([name, file]) => {
      bundle += `\n\n// ==================== FILE: ${file.path} ====================\n\n${file.content}\n`;
    });

    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'BiryaniShop_Android_SourceCode.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 font-bold">
      <div className="w-full max-w-3xl h-[84vh] bg-white border-2 border-blue-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Header - Compact */}
        <div className="px-4 py-2 border-b border-blue-200 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
            <div>
              <h2 className="text-sm font-black text-white uppercase flex items-center gap-1.5">
                Android Studio Source Code &amp; APK
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadAll}
              className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-black uppercase flex items-center gap-1 cursor-pointer transition border border-white/30"
            >
              <Download className="w-3.5 h-3.5" />
              Download All
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-slate-200 p-1 rounded hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Instructions banner - Compact */}
        <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100 text-blue-900 text-xs font-black flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
          <span>
            Build APK: Open in Android Studio &gt; Build &gt; Build APK(s). Or run <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800 font-mono">./gradlew assembleDebug</code>
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* File sidebar - Compact */}
          <div className="w-56 bg-slate-50 border-r border-slate-200 p-2 overflow-y-auto">
            <div className="text-xs font-black uppercase text-slate-500 px-2 py-1 tracking-wider">
              Project Files
            </div>
            <div className="space-y-1 mt-0.5">
              {Object.keys(projectFiles).map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    selectedFile === fileName
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  <span className="truncate">{fileName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden text-slate-100">
            <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="font-mono text-slate-300 truncate">
                {projectFiles[selectedFile]?.path}
              </span>
              <button
                onClick={handleCopy}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer transition border border-slate-700 uppercase"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-blue-400 stroke-[2.5]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 p-3 overflow-auto font-mono text-xs font-bold text-slate-200 leading-relaxed whitespace-pre select-text">
              {projectFiles[selectedFile]?.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

# ML Kit barcode scanning models are loaded via reflection; keep the API surface intact.
-keep class com.google.mlkit.vision.barcode.** { *; }
-keep class com.google.zxing.** { *; }

# kotlinx.serialization keeps generated serializer classes reachable.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class com.voidhub.phonemigrate.data.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclasseswithmembers class com.voidhub.phonemigrate.network.ControlMessage* {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.voidhub.phonemigrate.data.model.** { *; }
-keep,includedescriptorclasses class com.voidhub.phonemigrate.network.ControlMessage* { *; }

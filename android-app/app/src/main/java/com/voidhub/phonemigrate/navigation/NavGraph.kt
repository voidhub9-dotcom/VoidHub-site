package com.voidhub.phonemigrate.navigation

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.voidhub.phonemigrate.data.model.ConnectionInfo
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.service.TransferForegroundService
import com.voidhub.phonemigrate.ui.screens.home.HomeScreen
import com.voidhub.phonemigrate.ui.screens.receive.ReceiveScanScreen
import com.voidhub.phonemigrate.ui.screens.receive.ReceiveSetupScreen
import com.voidhub.phonemigrate.ui.screens.receive.ReceiveTransferScreen
import com.voidhub.phonemigrate.ui.screens.send.SelectDataScreen
import com.voidhub.phonemigrate.ui.screens.send.SendTransferScreen

@Composable
fun AppNavGraph(
    navController: NavHostController,
    transferService: TransferForegroundService?,
    deviceName: String,
) {
    var sendCategories by remember { mutableStateOf(setOf<DataCategory>()) }
    var sendFilesTreeUri by remember { mutableStateOf<Uri?>(null) }
    var receiveFilesTreeUri by remember { mutableStateOf<Uri?>(null) }
    var receiveConnectionInfo by remember { mutableStateOf<ConnectionInfo?>(null) }

    fun returnHome() {
        navController.popBackStack(Routes.HOME, inclusive = false)
    }

    NavHost(navController = navController, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            HomeScreen(
                onSendClick = { navController.navigate(Routes.SEND_SELECT) },
                onReceiveClick = { navController.navigate(Routes.RECEIVE_SETUP) },
            )
        }

        composable(Routes.SEND_SELECT) {
            SelectDataScreen(
                onBack = { navController.popBackStack() },
                onContinue = { categories, treeUri ->
                    sendCategories = categories
                    sendFilesTreeUri = treeUri
                    navController.navigate(Routes.SEND_TRANSFER)
                },
            )
        }

        composable(Routes.SEND_TRANSFER) {
            SendTransferScreen(
                service = transferService,
                categories = sendCategories,
                filesTreeUri = sendFilesTreeUri,
                deviceName = deviceName,
                onDone = { returnHome() },
            )
        }

        composable(Routes.RECEIVE_SETUP) {
            ReceiveSetupScreen(
                onBack = { navController.popBackStack() },
                onContinue = { treeUri ->
                    receiveFilesTreeUri = treeUri
                    navController.navigate(Routes.RECEIVE_SCAN)
                },
            )
        }

        composable(Routes.RECEIVE_SCAN) {
            ReceiveScanScreen(
                onBack = { navController.popBackStack() },
                onCodeScanned = { info ->
                    receiveConnectionInfo = info
                    navController.navigate(Routes.RECEIVE_TRANSFER)
                },
            )
        }

        composable(Routes.RECEIVE_TRANSFER) {
            val info = receiveConnectionInfo
            if (info != null) {
                ReceiveTransferScreen(
                    service = transferService,
                    connectionInfo = info,
                    filesTreeUri = receiveFilesTreeUri,
                    deviceName = deviceName,
                    onDone = { returnHome() },
                )
            }
        }
    }
}

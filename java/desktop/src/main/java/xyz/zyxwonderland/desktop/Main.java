package xyz.zyxwonderland.desktop;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.layout.BorderPane;
import javafx.stage.Stage;
import xyz.zyxwonderland.desktop.chess.ChessView;
import xyz.zyxwonderland.desktop.status.StatusView;

public class Main extends Application {

    @Override
    public void start(Stage stage) {
        TabPane tabs = new TabPane();
        tabs.setTabClosingPolicy(TabPane.TabClosingPolicy.UNAVAILABLE);

        Tab chessTab = new Tab("♟ Chess", new ChessView());
        Tab statusTab = new Tab("📡 Status", new StatusView());
        tabs.getTabs().addAll(chessTab, statusTab);

        BorderPane root = new BorderPane(tabs);
        Scene scene = new Scene(root, 600, 680);
        scene.getStylesheets().add(getClass().getResource("/styles.css").toExternalForm());

        stage.setTitle("Zyxxyz");
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) { launch(args); }
}

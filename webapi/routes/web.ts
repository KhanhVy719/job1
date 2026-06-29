import express from "express";
import MetaController from "../app/controller/Catalog/MetaController";
import StudioController from "../app/controller/Catalog/StudioController";
import PersonController from "../app/controller/Catalog/PersonController";
import MovieController from "../app/controller/Film/MovieController";
import SearchController from "../app/controller/Discovery/SearchController";
import HomeController from "../app/controller/Discovery/HomeController";
import AuthController from "../app/controller/Account/AuthController";

import Guest from "../app/middleware/Guest";

const Router = express.Router();


// API V1.0.0
Router.get("/menu/the-loai", MetaController.getAllCategories);
Router.get("/menu/quoc-gia", MetaController.getAllCountries);

Router.get("/nha-san-xuat", StudioController.getList);
Router.get("/dien-vien", PersonController.getList);

Router.get("/nha-san-xuat/:slug", StudioController.getDetail);
Router.get("/nha-san-xuat/:slug/phim", StudioController.getMovies);

Router.get("/dien-vien/:slug", PersonController.getDetail);
Router.get("/dien-vien/:slug/phim", PersonController.getMovies);

Router.get("/phim/:slug/de-xuat", MovieController.getRecommendations); 
Router.get("/phim/:slug", MovieController.getDetail);
Router.get("/watch/:slug/:episode_slug", MovieController.getSource); 
Router.get("/phim/:id/phan", MovieController.getAllSeasons);

Router.get("/the-loai/:slug", SearchController.byGenre);
Router.get("/quoc-gia/:slug", SearchController.byCountry);
Router.get("/duyet-tim",      SearchController.search);

Router.get("/home", HomeController.getHomeData);
Router.get("/lich-chieu", HomeController.getScheduledMovies);
Router.get("/showtimes/by-date/:date", HomeController.getShowtimesByDate);

Router.post("/auth/login", AuthController.Login);
Router.post("/auth/register", AuthController.Register);
Router.get("/auth/me",Guest, AuthController.getProfile);

export default Router;
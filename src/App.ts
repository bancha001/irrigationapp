import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as log4js from 'log4js';
import * as uuid from 'uuid/v1';
import * as ibmiotf from 'ibmiotf';
import * as session from 'express-session';
const config = require('./config/app');
const ssoConfig = require('./config/sso');
log4js.configure(__dirname+'/config/log4js.json', {});
const log = log4js.getLogger('IrrigationLogger');
import * as jws from 'jws';
// Creates and configures an ExpressJS web server.
export default class App {

    // ref to Express instance
    public express: express.Application;
    public client: any;
    private idToken: string;
    private userName: string;
    //Run configuration methods on the Express instance.
    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }

    // Configure Express middleware.
    private middleware(): void {
        var passport = require('passport');
        this.express.use(logger('dev'));
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));

        this.express.use(session({resave: 'true', saveUninitialized: 'true' , secret: 'goodday'}));
        this.express.use(passport.initialize());
        this.express.use(passport.session());
        passport.serializeUser( (user, done) => {
            this.idToken = user.idToken;
            this.userName = user._json.displayName;
            done(null, user);
        });

        passport.deserializeUser(function(obj, done) {
            done(null, obj);
        });


        var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;



        var Strategy = new OpenIDConnectStrategy({
                authorizationURL : ssoConfig.authorizationURL,
                tokenURL : ssoConfig.tokenURL,
                clientID : ssoConfig.clientID,
                scope: ssoConfig.scope,
                response_type: 'code',
                clientSecret : ssoConfig.clientSecret,
                callbackURL : ssoConfig.callbackURL,
                skipUserProfile: true,
                issuer: ssoConfig.issuer
                },
            function(iss, sub, profile, accessToken, refreshToken, params, done)  {
                process.nextTick(function() {
                    profile.accessToken = accessToken;
                    profile.refreshToken = refreshToken;
                    profile.idToken = params['id_token'];
                    done(null, profile);
                })
            });

        passport.use(Strategy);

        this.express.get('/ssocallback',function(req, res, next) {
            //var redirect_url = req.session.originalUrl;

            passport.authenticate('openidconnect', {
                successRedirect: '/clientRedirect',
                failureRedirect: '/failure',
            })(req,res,next);
        });

        this.express.get('/serverSidelogin', passport.authenticate('openidconnect', {}));



    }

    // Configure API endpoints.
    private routes(): void {
        /* This is just to get up and running, and to make sure what we've got is
         * working so far. This function will change when we start to add more
         * API endpoints */
        let router = express.Router();
        // placeholder route handler
        router.get('/', (req, res, next) => {
            res.json({
                message: 'Irrigation Application is running'
            });
        });
        this.express.use('/', router);

        this.express.get('/clientRedirect', (req, res) =>{

            res.json({
                "name": this.userName,
                "idToken": this.idToken
            })


        });


        this.express.get('/verify', (req, res) =>{

            res.json({
                "Valid": this.verifyToken(req.query.idToken)
            })


        });


        let iotAppConfig = {
            "org" : config.org,
            "id" : config.id,
            "auth-key" : config.authKey,
            "auth-token" : config.authToken
        }

        let appClient = new ibmiotf.IotfApplication(iotAppConfig);

        log.info("Connecting MQTT application client");
        appClient.connect();
        log.info("Successfully connected to our IoT service!");
        this.client = appClient;
        // subscribe to input events
        appClient.on("connect", function () {
            log.info("subscribe to input events");
            appClient.subscribeToDeviceEvents(config.type);
            this.client = appClient;

        });

        this.express.use('/getZoneStatus', (req, res, next) => {
            log.info('getZoneStatus for zone '+ req.query.zone );
            let idToken = req.get("Authorization").replace('Bearer ','');

            if(!this.verifyToken(idToken))
            {
                res.json(
                    {
                        "message": "Invalid Token"
                    }
                )
            }else {

                let requestId = uuid();

                let request = {"requestId": requestId, "command": "get", "zone": req.query.zone};
                log.info('RequestId: ' + requestId + ' DeviceType: ' + config.type + ' DeviceID: ' + config.id + ' CommandType: ' + config.eventType);
                appClient.publishDeviceCommand(config.type, config.id, config.eventType, config.format, request);
                //log.info('RequestId: '+requestId+ ' DeviceType: '+config.type+ ' DeviceID: '+config.id+ ' CommandType: '+config.eventType);
                appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
                    log.info('getZoneStatus response: ' + payload);
                    if (eventType == requestId) {
                        log.info('getZoneStatus response: ' + payload);
                        res.json(
                            JSON.parse(payload)
                        );
                    }

                });
            }
        });
        this.express.use('/getZonesStatus', (req, res, next) => {

            log.info('getZonesStatus for all');

            let idToken = req.get("Authorization").replace('Bearer ','');

            if(!this.verifyToken(idToken))
            {
                res.json(
                    {
                        "message": "Invalid Token"
                    }
                )
            }else {

                let requestId = uuid();
                let request = {"requestId": requestId, "command": "getAll"};
                appClient.publishDeviceCommand(config.type, config.id, config.eventType, config.format, request);
                log.info('RequestId: ' + requestId + ' DeviceType: ' + config.type + ' DeviceID: ' + config.id + ' CommandType: ' + config.eventType);

                appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {

                    if (eventType == requestId) {
                        log.info('getZonesStatus response:' + payload);
                        res.json(
                            JSON.parse(payload)
                        );
                    }

                });
            }
        });
        this.express.use('/setZoneStatus', (req, res, next) => {
            log.info('setZoneStatus for zone '+req.query.zone+' with switch type '+req.query.switchType );

            let idToken = req.get("Authorization").replace('Bearer ','');

            if(!this.verifyToken(idToken))
            {
                res.json(
                    {
                        "message": "Invalid Token"
                    }
                )
            }else {

                let requestId = uuid();

                let request = {
                    "requestId": requestId,
                    "command": "set",
                    "zone": req.query.zone,
                    "switchType": req.query.switchType
                };

                appClient.publishDeviceCommand(config.type, config.id, config.eventType, config.format, request);
                log.info('RequestId: ' + requestId + ' DeviceType: ' + config.type + ' DeviceID: ' + config.id + ' CommandType: ' + config.eventType);
                appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
                    if (eventType == requestId) {
                        log.info('setZoneStatus response:' + payload);
                        res.json(
                            JSON.parse(payload)
                        );
                    }

                });
            }
        });


    }
    private verifyToken(token: string): boolean
    {
        let isValid = false;
        let idTokenSegments = token.split('.')
            , jwtClaimsStr
            , jwtClaims
            , idHeader;

        try {
            let idTokenString = (new Buffer(idTokenSegments[0], 'base64')).toString();

            idHeader = JSON.parse(idTokenString);
            jwtClaimsStr = new Buffer(idTokenSegments[1], 'base64').toString();
            jwtClaims = JSON.parse(jwtClaimsStr);
        } catch (ex) {
            return false;
        }

        isValid = jws.verify(token, idHeader.alg, ssoConfig.clientSecret);
        if(isValid) {
            let currTime = Math.round(new Date().getTime() / 1000.0);
            if (currTime >= jwtClaims.exp) {
                isValid = false;
            }
        }
        return isValid;

    }


}

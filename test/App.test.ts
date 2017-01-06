import * as mocha from 'mocha';
import * as chai from 'chai';
import chaiHttp = require('chai-http');
import {IotfApplication, ApplicationClient} from 'ibmiotf';
import app1 from '../src/App';
import * as sinon from 'sinon';
import {EventEmitter} from "events";
import * as uuid from 'uuid';

chai.use(chaiHttp);
const expect = chai.expect;
describe('baseRoute', function(){
    //this.timeout(1000);
    let app2 = new app1();
    let app = app2.express;
    it('should be json', () => {

        chai.request(app).get('/')
            .then(res => {
                expect(res.type).to.eql('application/json');
            });
    });

    it('should have a message prop', () => {
        chai.request(app).get('/')
            .then(res => {
                expect(res.body.message).to.eql('Irrigation Application is running');
            });
    });
    // it('should have zone status to be ON or OFF', () => {
    //
    //     let callback = sinon.spy();
    //     let fakeMqtt = new EventEmitter();
    //     let funct1 = function(){
    //         console.log('AAA');
    //     }
    //     sinon.stub(app2.client, 'connect').returns({
    //         on: callback
    //     });
    //
    //     let funct = function(){
    //         console.log('AAA');
    //     }
    //     app2.client.connect();
    //     app2.client.on('deviceEvent', funct);
    //     expect(callback.calledWith('connect')).to.be.true;
    //
    //     // let topic = 'iot-2/type/iotsample-ti-bbst/id/78a504edd7df/evt/myevt/fmt/json';
    //     // let payload = '{}';
    //     //
    //     //
    //     // {
    //     //     "org": "u3xwki",
    //     //     "type": "iotsample-ti-bbst",
    //     //     "id": "78a504edd7df",
    //     //     "authKey": "a-u3xwki-lxcmgn7mrg",
    //     //     "authToken": "u5q+i8aJLr+)veCix3",
    //     //     "eventType": "blink",
    //     //     "format": "json"
    //     // }
    //     //
    //     // fakeMqtt.emit('message', topic, payload);
    //     sinon.stub(app2.client,'publishDeviceCommand');
    //
    //         // console.log("Is connect "+app2.client.isConnected);
    //     //
    //     // let callback1 = sinon.spy();
    //     //
    //     //
    //     // app2.client.on('deviceCommand', callback1);
    //
    //
    //
    //     let topic = 'iot-2/type/123/id/123/cmd/mycmd/fmt/json';
    //     let payload = '{}';
    //
    //     fakeMqtt.emit('deviceEvent', topic, payload);
    //
    //     fakeMqtt.emit('deviceEvent', 'iotsample-ti-bbst ','78a504edd7df','123','json', '{"test":"good"}');
    //     // sinon.stub(app2.client,'on').returns({
    //     //
    //     // });
    //
    //
    //
    //     chai.request(app).get('/getZoneStatus?zone=1')
    //             .then(res => {
    //                 console.log('Test');
    //                 //expect(res.body.message).to.eql('Irrigation Application is running');
    //             });
    //
    //
    //
    // });

    // it('should emit a deviceEvent', function(done){
    //     // This assumes your object inherits from Node's EventEmitter
    //     // The name of your `emit` method may be different, eg `trigger`
    //     var eventStub = sinon.stub(app2.client, 'emit')
    //
    //     app2.client.connect();
    //     expect(eventStub.calledWith("connect"));
    //
    //
    //
    //     eventStub.restore();
    //     // chai.request(app).get('/getZoneStatus?zone=1')
    //     //     .then(res => {
    //     //         console.log('Test');
    //     //         //expect(res.body.message).to.eql('Irrigation Application is running');
    //     //     });
    //
    //     done();
    // });
    //
    // it('should pass arguments to the callbacks', (done) =>{
    //             var emitter = new EventEmitter();
    //
    //             emitter.on('foo', function(a, b){
    //
    //                 expect(a,'bar').to.be.eql('bar');
    //                 expect(b,'baz1').to.be.eql('baz');
    //
    //                 // a.should.equal('bar');
    //                 // b.should.equal('baz');
    //                 done();
    //             });
    //
    //             emitter.emit('foo', 'bar', 'baz');
    // });

    it('should pass arguments to the callbacks2', (done) =>{
        var emitter = new EventEmitter();

        app2.client.on('deviceEvent', (a, b,c,d) => {
            console.log('We are here');
            // expect(a,'bar').to.be.eql('bar');
            // expect(b,'baz1').to.be.eql('baz');

            // a.should.equal('bar');
            // b.should.equal('baz');

            // res.json(
            //     JSON.parse({"dd":"xx"})
            //);

            done();
        });
        sinon.stub(uuid, 'v1', function () {
            console.log('uuid is called');
            return '123';
        });
        console.log('UUID '+uuid.v1());
        //sinon.stub(app2.client,'publishDeviceCommand');
        //emitter.emit('connect');
        //emitter.emit('deviceEvent', 'iotsample-ti-bbst ','78a504edd7df','blink','json', '{"test":"good"}');

        chai.request(app).get('/getZoneStatus?zone=1')
            .then(res => {
                console.log('Test');
                //expect(res.body.message).to.eql('Irrigation Application is running');
                done();
            });
        emitter.emit('deviceEvent', 'iotsample-ti-bbst ','78a504edd7df','blink','json', '{"test":"good"}');

    });

});

interface person {
    name: string;
    age: number;
    address: string;
    signIn(): string;
    coupon(coupon: string,value:number): number;

}

const person1: person = {
    name: "John",
    age: 30,
    address: "New York",
    signIn: function () {
        return "John is signing in";
    },
    coupon:(name: "person1",value : 10)=> {
        return 10;
    }
}

console.log(person1,person1.coupon("person1",10));